const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DIDRegistry", function () {
  let didRegistry;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();
  });

  describe("DID Registration", function () {
    it("Should allow registration of a new DID", async function () {
      const did = "did:ethr:0x123";
      const publicKey = ethers.toUtf8Bytes("publicKey123");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await expect(
        didRegistry.connect(addr1).registerDID(did, publicKey, keyType)
      ).to.emit(didRegistry, "DIDRegistered");

      const didDoc = await didRegistry.getDIDDocument(did);
      expect(didDoc.did).to.equal(did);
      expect(didDoc.controller).to.equal(addr1.address);
      expect(didDoc.isActive).to.be.true;
    });

    it("Should prevent duplicate DID registration", async function () {
      const did = "did:ethr:0x123";
      const publicKey = ethers.toUtf8Bytes("publicKey123");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(addr1).registerDID(did, publicKey, keyType);

      await expect(
        didRegistry.connect(addr1).registerDID(did, publicKey, keyType)
      ).to.be.revertedWith("DID already exists");
    });
  });

  describe("Key Rotation", function () {
    it("Should allow key rotation by DID controller", async function () {
      const did = "did:ethr:0x123";
      const oldPublicKey = ethers.toUtf8Bytes("publicKey123");
      const newPublicKey = ethers.toUtf8Bytes("publicKey456");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(addr1).registerDID(did, oldPublicKey, keyType);

      await expect(
        didRegistry.connect(addr1).rotateKey(did, newPublicKey, keyType)
      ).to.emit(didRegistry, "DIDKeyRotated");

      const didDoc = await didRegistry.getDIDDocument(did);
      expect(didDoc.publicKey).to.equal(ethers.hexlify(newPublicKey));
    });
  });
});
