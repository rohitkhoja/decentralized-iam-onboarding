const { MerkleTree } = require("merkletreejs");
const { ethers } = require("ethers");
const IPFSClient = require("../ipfs/ipfsClient");

class StatusListService {
  constructor(ipfsClient, credentialStatusRegistry, signer) {
    this.ipfsClient = ipfsClient;
    this.credentialStatusRegistry = credentialStatusRegistry;
    this.signer = signer;
  }

  generateLeaf(credentialId, revoked = false) {
    return ethers.keccak256(
      ethers.solidityPacked(["string", "bool"], [credentialId, revoked])
    );
  }

  generateMerkleTree(credentialIds, revokedIds = new Set()) {
    let leaves = credentialIds.map(id => 
      this.generateLeaf(id, revokedIds.has(id))
    );
    
    if (leaves.length === 0) {
      const emptyLeaf = ethers.keccak256(ethers.solidityPacked(["string", "bool"], ["empty", false]));
      leaves = [emptyLeaf];
    }
    
    const tree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
    let root = tree.getHexRoot();
    
    if (!root || root === "0x" || root === "0x0" || root.length !== 66) {
      if (leaves.length === 1) {
        root = leaves[0];
      } else {
        root = ethers.keccak256(ethers.solidityPacked(["string", "uint256"], ["empty-status-list", leaves.length]));
      }
      
      if (!root || root === "0x" || root.length !== 66) {
        throw new Error("Failed to generate valid Merkle tree root hash");
      }
    }
    
    return {
      tree,
      root,
      leaves,
      size: Math.max(credentialIds.length, 1)
    };
  }

  getProof(tree, credentialId, revoked = false) {
    const leaf = this.generateLeaf(credentialId, revoked);
    const proof = tree.getHexProof(leaf);
    return proof.map(p => ethers.getBytes(p));
  }

  getIndex(credentialIds, credentialId) {
    return credentialIds.indexOf(credentialId);
  }

  async createStatusList(statusListId, issuerDID, credentialIds, ipfsConfig = {}) {
    const merkleTree = this.generateMerkleTree(credentialIds);
    
    if (!merkleTree.root || merkleTree.root === "0x" || merkleTree.root === "0x0" || merkleTree.root.length !== 66) {
      throw new Error(`Invalid root hash generated: "${merkleTree.root}" (length: ${merkleTree.root ? merkleTree.root.length : 0})`);
    }
    
    const rootHash = merkleTree.root;
    const listSize = Math.max(credentialIds.length, 1);
    const idsForEncoding = credentialIds.length > 0 ? credentialIds : ["empty"];
    
    const statusList = {
      id: statusListId,
      type: "StatusList2021",
      statusPurpose: "revocation",
      encodedList: this.encodeStatusList(idsForEncoding, new Set()),
      merkleRoot: rootHash
    };

    const cid = await this.ipfsClient.store(statusList);
    const statusListURI = this.ipfsClient.getIPFSUri(cid.cid);

    if (ipfsConfig.pin) {
      await this.ipfsClient.pin(cid.cid);
    }

    const registryWithSigner = this.credentialStatusRegistry.connect(this.signer);
    const tx = await registryWithSigner.createStatusList(
      statusListId,
      issuerDID,
      rootHash,
      listSize,
      statusListURI
    );
    await tx.wait();

    return {
      statusListId,
      rootHash: merkleTree.root,
      cid: cid.cid,
      statusListURI,
      txHash: tx.hash
    };
  }

  async updateStatusList(statusListId, credentialIds, revokedIds, ipfsConfig = {}) {
    const merkleTree = this.generateMerkleTree(credentialIds, revokedIds);
    
    const statusList = {
      id: statusListId,
      type: "StatusList2021",
      statusPurpose: "revocation",
      encodedList: this.encodeStatusList(credentialIds, revokedIds),
      merkleRoot: merkleTree.root
    };

    const existingList = await this.credentialStatusRegistry.getStatusList(statusListId);
    const oldCid = existingList.statusListURI.replace("ipfs://", "");

    const cid = await this.ipfsClient.store(statusList);
    const statusListURI = this.ipfsClient.getIPFSUri(cid.cid);

    if (ipfsConfig.pin) {
      await this.ipfsClient.pin(cid.cid);
      if (ipfsConfig.unpinOld) {
        await this.ipfsClient.unpin(oldCid);
      }
    }

    const registryWithSigner = this.credentialStatusRegistry.connect(this.signer);
    const tx = await registryWithSigner.updateStatusList(
      statusListId,
      merkleTree.root,
      revokedIds.size
    );
    await tx.wait();

    return {
      statusListId,
      rootHash: merkleTree.root,
      cid: cid.cid,
      statusListURI,
      revokedCount: revokedIds.size,
      txHash: tx.hash
    };
  }

  encodeStatusList(credentialIds, revokedIds) {
    const bits = credentialIds.map(id => revokedIds.has(id) ? "1" : "0");
    const bitString = bits.join("");
    const bytes = [];
    for (let i = 0; i < bitString.length; i += 8) {
      const byte = bitString.slice(i, i + 8).padEnd(8, "0");
      bytes.push(parseInt(byte, 2));
    }
    return Buffer.from(bytes).toString("base64");
  }

  async generateProofForCredential(statusListId, credentialId, credentialIds, revokedIds = new Set()) {
    const merkleTree = this.generateMerkleTree(credentialIds, revokedIds);
    const index = this.getIndex(credentialIds, credentialId);
    const revoked = revokedIds.has(credentialId);
    const proof = this.getProof(merkleTree, credentialId, revoked);

    return {
      proof,
      index,
      revoked
    };
  }
}

module.exports = StatusListService;

