const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration Tests", function () {
  let didRegistry;
  let credentialStatusRegistry;
  let auditLog;
  let owner;
  let issuer;
  let holder;

  beforeEach(async function () {
    [owner, issuer, holder] = await ethers.getSigners();
    
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();

    const CredentialStatusRegistry = await ethers.getContractFactory("CredentialStatusRegistry");
    credentialStatusRegistry = await CredentialStatusRegistry.deploy();
    await credentialStatusRegistry.waitForDeployment();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy(
      await didRegistry.getAddress(),
      await credentialStatusRegistry.getAddress()
    );
    await auditLog.waitForDeployment();

    await didRegistry.setAuditLog(await auditLog.getAddress());
    await credentialStatusRegistry.setAuditLog(await auditLog.getAddress());
  });

  describe("Full Credential Lifecycle", function () {
    it("Should complete full flow: DID registration → status list → credential → revocation", async function () {
      const issuerDID = "did:ethr:issuer1";
      const holderDID = "did:ethr:holder1";
      const credentialId = "cred1";
      const statusListId = "list1";

      const issuerPublicKey = ethers.toUtf8Bytes("issuerKey");
      const holderPublicKey = ethers.toUtf8Bytes("holderKey");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(issuerDID, issuerPublicKey, keyType);
      await didRegistry.connect(holder).registerDID(holderDID, holderPublicKey, keyType);

      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(issuer).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );

      await credentialStatusRegistry.connect(issuer).revokeCredential(
        credentialId,
        statusListId,
        "Employee terminated"
      );

      const isRevoked = await credentialStatusRegistry.isRevoked(credentialId);
      expect(isRevoked).to.be.true;

      const totalEvents = await auditLog.getTotalEvents();
      expect(totalEvents).to.be.gte(4);
    });
  });

  describe("AuditLog Integration with DIDRegistry", function () {
    it("Should log DID registration events", async function () {
      const did = "did:ethr:test1";
      const publicKey = ethers.toUtf8Bytes("key1");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(did, publicKey, keyType);

      const didHistory = await auditLog.getDIDHistory(did);
      expect(didHistory.length).to.be.gte(1);
    });

    it("Should log key rotation events", async function () {
      const did = "did:ethr:test2";
      const oldKey = ethers.toUtf8Bytes("oldKey");
      const newKey = ethers.toUtf8Bytes("newKey");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(did, oldKey, keyType);
      await didRegistry.connect(issuer).rotateKey(did, newKey, keyType);

      const didHistory = await auditLog.getDIDHistory(did);
      expect(didHistory.length).to.be.gte(2);
    });

    it("Should log DID deactivation events", async function () {
      const did = "did:ethr:test3";
      const publicKey = ethers.toUtf8Bytes("key3");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(did, publicKey, keyType);
      await didRegistry.connect(issuer).deactivateDID(did);

      const didHistory = await auditLog.getDIDHistory(did);
      expect(didHistory.length).to.be.gte(2);
    });
  });

  describe("AuditLog Integration with CredentialStatusRegistry", function () {
    beforeEach(async function () {
      const issuerDID = "did:ethr:issuer1";
      const issuerPublicKey = ethers.toUtf8Bytes("issuerKey");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(issuerDID, issuerPublicKey, keyType);
    });

    it("Should log status list creation events", async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(issuer).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );

      const issuerHistory = await auditLog.getDIDHistory(issuerDID);
      expect(issuerHistory.length).to.be.gte(2);
    });

    it("Should log credential revocation events", async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";
      const credentialId = "cred1";

      await credentialStatusRegistry.connect(issuer).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );

      await credentialStatusRegistry.connect(issuer).revokeCredential(
        credentialId,
        statusListId,
        "Test revocation"
      );

      const credHistory = await auditLog.getCredentialHistory(credentialId);
      expect(credHistory.length).to.be.gte(1);
    });

    it("Should log status list update events", async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const newRootHash = ethers.keccak256(ethers.toUtf8Bytes("newroot"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(issuer).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );

      await credentialStatusRegistry.connect(issuer).updateStatusList(
        statusListId,
        newRootHash,
        5
      );

      const issuerHistory = await auditLog.getDIDHistory(issuerDID);
      expect(issuerHistory.length).to.be.gte(3);
    });
  });

  describe("Error Handling Across Contracts", function () {
    it("Should handle errors gracefully when AuditLog is disabled", async function () {
      await didRegistry.disableAuditLog();

      const did = "did:ethr:test4";
      const publicKey = ethers.toUtf8Bytes("key4");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await expect(
        didRegistry.connect(issuer).registerDID(did, publicKey, keyType)
      ).to.not.be.reverted;

      const didDoc = await didRegistry.getDIDDocument(did);
      expect(didDoc.did).to.equal(did);
    });

    it("Should handle errors when status list doesn't exist", async function () {
      const credentialId = "cred1";
      const statusListId = "nonexistent";

      await expect(
        credentialStatusRegistry.connect(issuer).revokeCredential(
          credentialId,
          statusListId,
          "Test"
        )
      ).to.be.revertedWith("Status list does not exist");
    });
  });
});

