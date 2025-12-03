const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

class DIDService {
  constructor(provider, contractAddresses) {
    this.provider = provider;
    this.contractAddresses = contractAddresses;
    
    if (!contractAddresses.didRegistry || contractAddresses.didRegistry === "") {
      throw new Error("DID_REGISTRY_ADDRESS is not set in .env file");
    }
    
    const didRegistryABI = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../artifacts/contracts/DIDRegistry.sol/DIDRegistry.json"))
    ).abi;
    
    this.didRegistry = new ethers.Contract(
      contractAddresses.didRegistry,
      didRegistryABI,
      provider
    );
  }

  async registerDID(wallet, did, publicKey, keyType = "EcdsaSecp256k1VerificationKey2019") {
    const didRegistryWithSigner = this.didRegistry.connect(wallet);
    const publicKeyBytes = typeof publicKey === "string" ? ethers.toUtf8Bytes(publicKey) : publicKey;
    
    const tx = await didRegistryWithSigner.registerDID(did, publicKeyBytes, keyType);
    await tx.wait();
    
    return {
      did,
      publicKey: typeof publicKey === "string" ? publicKey : ethers.hexlify(publicKey),
      keyType,
      txHash: tx.hash,
    };
  }

  async getDIDDocument(did) {
    const didDoc = await this.didRegistry.getDIDDocument(did);
    return {
      did: didDoc.did,
      controller: didDoc.controller,
      publicKey: ethers.hexlify(didDoc.publicKey),
      keyType: didDoc.keyType,
      isActive: didDoc.isActive,
      createdAt: didDoc.createdAt.toString(),
      updatedAt: didDoc.updatedAt.toString(),
    };
  }

  async isDIDActive(did) {
    return await this.didRegistry.isDIDActive(did);
  }
}

module.exports = DIDService;

