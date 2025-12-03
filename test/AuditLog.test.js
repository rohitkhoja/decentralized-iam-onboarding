const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditLog", function () {
  let auditLog;
  let didRegistry;
  let credentialStatusRegistry;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();
    const didRegistryAddress = await didRegistry.getAddress();

    const CredentialStatusRegistry = await ethers.getContractFactory("CredentialStatusRegistry");
    credentialStatusRegistry = await CredentialStatusRegistry.deploy();
    await credentialStatusRegistry.waitForDeployment();
    const credentialStatusRegistryAddress = await credentialStatusRegistry.getAddress();

    const AuditLog = await ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy(didRegistryAddress, credentialStatusRegistryAddress);
    await auditLog.waitForDeployment();
  });

  describe("Event Logging", function () {
    it("Should log event from authorized contract", async function () {
      const eventType = 0;
      const actorDID = "did:ethr:issuer1";
      const actorAddress = addr1.address;
      const subjectDID = "did:ethr:holder1";
      const credentialId = "cred1";
      const details = "Credential issued";

      await didRegistry.setAuditLog(await auditLog.getAddress());
      await didRegistry.connect(addr1).registerDID(
        actorDID,
        ethers.toUtf8Bytes("key"),
        "EcdsaSecp256k1VerificationKey2019"
      );

      const totalEvents = await auditLog.getTotalEvents();
      expect(totalEvents).to.be.gte(1);
    });

    it("Should prevent unauthorized contracts from logging", async function () {
      const initialEventCount = await auditLog.getTotalEvents();

      const UnauthorizedContract = await ethers.getContractFactory("DIDRegistry");
      const unauthorized = await UnauthorizedContract.deploy();
      await unauthorized.waitForDeployment();

      await unauthorized.setAuditLog(await auditLog.getAddress());

      const did = "did:ethr:unauthorized";
      const publicKey = ethers.toUtf8Bytes("key");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await expect(
        unauthorized.connect(addr1).registerDID(did, publicKey, keyType)
      ).to.be.revertedWith("Only authorized contracts can create entries");

      const finalEventCount = await auditLog.getTotalEvents();
      expect(finalEventCount).to.equal(initialEventCount);
    });
  });

  describe("Event Retrieval", function () {
    beforeEach(async function () {
      await didRegistry.setAuditLog(await auditLog.getAddress());
      
      await didRegistry.connect(addr1).registerDID(
        "did:ethr:issuer1",
        ethers.toUtf8Bytes("key"),
        "EcdsaSecp256k1VerificationKey2019"
      );
    });

    it("Should retrieve audit entry by event ID", async function () {
      const entry = await auditLog.getAuditEntry(1);
      expect(entry.eventId).to.equal(1);
      expect(entry.actorDID).to.equal("did:ethr:issuer1");
    });

    it("Should retrieve DID history", async function () {
      const history = await auditLog.getDIDHistory("did:ethr:issuer1");
      expect(history.length).to.be.gte(1);
    });

    it("Should retrieve actor history", async function () {
      const history = await auditLog.getActorHistory(addr1.address);
      expect(history.length).to.be.gte(1);
    });
  });

  describe("Event Types", function () {
    beforeEach(async function () {
      await didRegistry.setAuditLog(await auditLog.getAddress());
      await credentialStatusRegistry.setAuditLog(await auditLog.getAddress());
    });

    it("Should log different event types through contract interactions", async function () {
      const did = "did:ethr:test";
      const publicKey = ethers.toUtf8Bytes("key");
      const keyType = "EcdsaSecp256k1VerificationKey2019";

      await didRegistry.connect(addr1).registerDID(did, publicKey, keyType);
      await didRegistry.connect(addr1).rotateKey(did, ethers.toUtf8Bytes("newkey"), keyType);
      await didRegistry.connect(addr1).deactivateDID(did);

      const totalEvents = await auditLog.getTotalEvents();
      expect(totalEvents).to.be.gte(3);
    });
  });

  describe("Query by Type and Time Range", function () {
    beforeEach(async function () {
      await didRegistry.setAuditLog(await auditLog.getAddress());
      
      await didRegistry.connect(addr1).registerDID(
        "did:ethr:issuer1",
        ethers.toUtf8Bytes("key"),
        "EcdsaSecp256k1VerificationKey2019"
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      await didRegistry.connect(addr1).rotateKey(
        "did:ethr:issuer1",
        ethers.toUtf8Bytes("newkey"),
        "EcdsaSecp256k1VerificationKey2019"
      );
    });

    it("Should query events by type and time range", async function () {
      const startTime = (await ethers.provider.getBlock("latest")).timestamp - 100;
      const endTime = (await ethers.provider.getBlock("latest")).timestamp + 100;

      const results = await auditLog.queryEventsByTypeAndTimeRange(
        5,
        startTime,
        endTime
      );

      expect(results.length).to.be.gte(1);
    });
  });

  describe("Contract Reference Updates", function () {
    it("Should update contract references", async function () {
      const newDIDRegistry = await ethers.getContractFactory("DIDRegistry");
      const newDidReg = await newDIDRegistry.deploy();
      await newDidReg.waitForDeployment();

      const newCredStatusReg = await ethers.getContractFactory("CredentialStatusRegistry");
      const newCredReg = await newCredStatusReg.deploy();
      await newCredReg.waitForDeployment();

      await auditLog.updateContractReferences(
        await newDidReg.getAddress(),
        await newCredReg.getAddress()
      );

      const updatedDIDReg = await auditLog.didRegistry();
      const updatedCredReg = await auditLog.credentialStatusRegistry();

      expect(updatedDIDReg).to.equal(await newDidReg.getAddress());
      expect(updatedCredReg).to.equal(await newCredReg.getAddress());
    });
  });
});

