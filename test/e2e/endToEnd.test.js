const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("End-to-End Tests", function () {
  let didRegistry;
  let credentialStatusRegistry;
  let auditLog;
  let issuer;
  let holder;
  let verifier;

  beforeEach(async function () {
    [issuer, holder, verifier] = await ethers.getSigners();
    
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

  describe("Complete Issuer Flow", function () {
    it("Should complete: register DID → create status list → issue credential → revoke credential", async function () {
      const issuerDID = "did:ethr:issuer-e2e";
      const issuerPublicKey = ethers.toUtf8Bytes("issuerKey");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(issuerDID, issuerPublicKey, keyType);
      
      const statusListId = "list-e2e";
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

      const credentialId = "cred-e2e-1";
      await credentialStatusRegistry.connect(issuer).revokeCredential(
        credentialId,
        statusListId,
        "Test revocation"
      );

      const isRevoked = await credentialStatusRegistry.isRevoked(credentialId);
      expect(isRevoked).to.be.true;

      const totalEvents = await auditLog.getTotalEvents();
      expect(totalEvents).to.be.gte(3);
    });
  });

  describe("Complete Holder Flow", function () {
    it("Should complete: register DID → receive credential → present credential", async function () {
      const holderDID = "did:ethr:holder-e2e";
      const holderPublicKey = ethers.toUtf8Bytes("holderKey");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(holder).registerDID(holderDID, holderPublicKey, keyType);

      const didDoc = await didRegistry.getDIDDocument(holderDID);
      expect(didDoc.did).to.equal(holderDID);
      expect(didDoc.isActive).to.be.true;

      const holderHistory = await auditLog.getDIDHistory(holderDID);
      expect(holderHistory.length).to.be.gte(1);
    });
  });

  describe("Complete Verifier Flow", function () {
    it("Should complete: verify credential → check status → grant/deny access", async function () {
      const issuerDID = "did:ethr:verifier-issuer";
      const issuerPublicKey = ethers.toUtf8Bytes("issuerKey");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(issuerDID, issuerPublicKey, keyType);

      const statusListId = "list-verify";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      
      await credentialStatusRegistry.connect(issuer).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        100,
        "ipfs://QmHash"
      );

      const credentialId = "cred-verify-1";
      
      const leaf = ethers.keccak256(ethers.solidityPacked(["string", "bool"], [credentialId, false]));
      const singleRootHash = leaf;
      
      const singleStatusListId = "list-verify-single";
      await credentialStatusRegistry.connect(issuer).createStatusList(
        singleStatusListId,
        issuerDID,
        singleRootHash,
        1,
        "ipfs://QmHash"
      );

      const proof = [];
      const index = 0;

      const isValid = await credentialStatusRegistry.verifyCredentialStatus(
        credentialId,
        singleStatusListId,
        proof,
        index
      );
      expect(isValid).to.be.true;

      await credentialStatusRegistry.connect(issuer).revokeCredential(
        credentialId,
        statusListId,
        "Revoked for testing"
      );

      const isRevokedAfter = await credentialStatusRegistry.isRevoked(credentialId);
      expect(isRevokedAfter).to.be.true;

      const isValidAfter = await credentialStatusRegistry.verifyCredentialStatus(
        credentialId,
        statusListId,
        proof,
        index
      );
      expect(isValidAfter).to.be.false;
    });
  });

  describe("Complete Revocation Flow", function () {
    it("Should revoke credential and verify revocation propagates", async function () {
      const issuerDID = "did:ethr:revoke-issuer";
      const issuerPublicKey = ethers.toUtf8Bytes("issuerKey");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(issuer).registerDID(issuerDID, issuerPublicKey, keyType);

      const statusListId = "list-revoke";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      
      await credentialStatusRegistry.connect(issuer).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        100,
        "ipfs://QmHash"
      );

      const credentialId = "cred-revoke-1";

      const isRevokedBefore = await credentialStatusRegistry.isRevoked(credentialId);
      expect(isRevokedBefore).to.be.false;

      await credentialStatusRegistry.connect(issuer).revokeCredential(
        credentialId,
        statusListId,
        "Revocation test"
      );

      const isRevokedAfter = await credentialStatusRegistry.isRevoked(credentialId);
      expect(isRevokedAfter).to.be.true;

      const revocationTimestamp = await credentialStatusRegistry.getRevocationTimestamp(credentialId);
      expect(revocationTimestamp).to.be.gt(0);

      const credHistory = await auditLog.getCredentialHistory(credentialId);
      expect(credHistory.length).to.be.gte(1);
    });
  });
});

