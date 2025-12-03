const { ethers } = require("ethers");
const KeyManager = require("./keyManager");

class DIDManager {
  constructor(provider, didRegistryAddress, didRegistryABI) {
    this.provider = provider;
    this.keyManager = new KeyManager();
    this.didRegistry = new ethers.Contract(didRegistryAddress, didRegistryABI, provider);
  }

  async createDID(signer, did, publicKey, keyType = "EcdsaSecp256k1VerificationKey2019") {
    const didRegistryWithSigner = this.didRegistry.connect(signer);
    const tx = await didRegistryWithSigner.registerDID(did, publicKey, keyType);
    await tx.wait();
    return { did, publicKey, keyType, txHash: tx.hash };
  }

  async rotateKey(signer, did, newPublicKey, keyType = "EcdsaSecp256k1VerificationKey2019") {
    const didRegistryWithSigner = this.didRegistry.connect(signer);
    const tx = await didRegistryWithSigner.rotateKey(did, newPublicKey, keyType);
    await tx.wait();
    return { did, newPublicKey, keyType, txHash: tx.hash };
  }

  async deactivateDID(signer, did) {
    const didRegistryWithSigner = this.didRegistry.connect(signer);
    const tx = await didRegistryWithSigner.deactivateDID(did);
    await tx.wait();
    return { did, txHash: tx.hash };
  }

  async getDIDDocument(did) {
    return await this.didRegistry.getDIDDocument(did);
  }

  async isDIDActive(did) {
    return await this.didRegistry.isDIDActive(did);
  }

  async getPublicKey(did) {
    return await this.didRegistry.getPublicKey(did);
  }

  generateDID(method = "ethr", identifier) {
    if (!identifier) {
      const keyPair = this.keyManager.generateKeyPair();
      identifier = keyPair.address;
    }
    return `did:${method}:${identifier}`;
  }

  async resolveDID(did) {
    const didDoc = await this.getDIDDocument(did);
    if (!didDoc || didDoc.controller === ethers.ZeroAddress) {
      return null;
    }
    return {
      did: didDoc.did,
      controller: didDoc.controller,
      publicKey: didDoc.publicKey,
      keyType: didDoc.keyType,
      isActive: didDoc.isActive,
      createdAt: didDoc.createdAt,
      updatedAt: didDoc.updatedAt
    };
  }
}

module.exports = DIDManager;

