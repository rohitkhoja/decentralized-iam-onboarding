const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialStatusRegistry", function () {
  let credentialStatusRegistry;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const CredentialStatusRegistry = await ethers.getContractFactory("CredentialStatusRegistry");
    credentialStatusRegistry = await CredentialStatusRegistry.deploy();
    await credentialStatusRegistry.waitForDeployment();
  });

  describe("Status List Creation", function () {
    it("Should create a new status list", async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await expect(
        credentialStatusRegistry.connect(addr1).createStatusList(
          statusListId,
          issuerDID,
          rootHash,
          listSize,
          statusListURI
        )
      ).to.emit(credentialStatusRegistry, "StatusListCreated");

      const statusList = await credentialStatusRegistry.getStatusList(statusListId);
      expect(statusList.statusListId).to.equal(statusListId);
      expect(statusList.issuerDID).to.equal(issuerDID);
      expect(statusList.rootHash).to.equal(rootHash);
      expect(statusList.listSize).to.equal(listSize);
      expect(statusList.isActive).to.be.true;
    });

    it("Should prevent duplicate status list creation", async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(addr1).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );

      await expect(
        credentialStatusRegistry.connect(addr1).createStatusList(
          statusListId,
          issuerDID,
          rootHash,
          listSize,
          statusListURI
        )
      ).to.be.revertedWith("Status list already exists");
    });

    it("Should register issuer address on first status list creation", async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(addr1).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );

      const issuerAddress = await credentialStatusRegistry.getIssuerAddress(issuerDID);
      expect(issuerAddress).to.equal(addr1.address);
    });
  });

  describe("Status List Updates", function () {
    beforeEach(async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(addr1).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );
    });

    it("Should update status list root hash", async function () {
      const statusListId = "list1";
      const newRootHash = ethers.keccak256(ethers.toUtf8Bytes("newroot"));
      const revokedCount = 5;

      await expect(
        credentialStatusRegistry.connect(addr1).updateStatusList(
          statusListId,
          newRootHash,
          revokedCount
        )
      ).to.emit(credentialStatusRegistry, "StatusListUpdated");

      const statusList = await credentialStatusRegistry.getStatusList(statusListId);
      expect(statusList.rootHash).to.equal(newRootHash);
      expect(statusList.revokedCount).to.equal(revokedCount);
    });

    it("Should prevent non-issuer from updating status list", async function () {
      const statusListId = "list1";
      const newRootHash = ethers.keccak256(ethers.toUtf8Bytes("newroot"));
      const revokedCount = 5;

      await expect(
        credentialStatusRegistry.connect(addr2).updateStatusList(
          statusListId,
          newRootHash,
          revokedCount
        )
      ).to.be.revertedWith("Only issuer can perform this action");
    });
  });

  describe("Credential Revocation", function () {
    beforeEach(async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(addr1).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );
    });

    it("Should revoke a single credential", async function () {
      const credentialId = "cred1";
      const statusListId = "list1";
      const reason = "Employee terminated";

      await expect(
        credentialStatusRegistry.connect(addr1).revokeCredential(
          credentialId,
          statusListId,
          reason
        )
      ).to.emit(credentialStatusRegistry, "CredentialRevoked");

      const isRevoked = await credentialStatusRegistry.isRevoked(credentialId);
      expect(isRevoked).to.be.true;

      const revocationTimestamp = await credentialStatusRegistry.getRevocationTimestamp(credentialId);
      expect(revocationTimestamp).to.be.gt(0);
    });

    it("Should batch revoke multiple credentials", async function () {
      const credentialIds = ["cred1", "cred2", "cred3"];
      const statusListId = "list1";
      const reason = "Batch revocation";

      await expect(
        credentialStatusRegistry.connect(addr1).batchRevokeCredentials(
          credentialIds,
          statusListId,
          reason
        )
      ).to.emit(credentialStatusRegistry, "CredentialRevoked");

      for (const credId of credentialIds) {
        const isRevoked = await credentialStatusRegistry.isRevoked(credId);
        expect(isRevoked).to.be.true;
      }
    });

    it("Should prevent non-issuer from revoking credentials", async function () {
      const credentialId = "cred1";
      const statusListId = "list1";
      const reason = "Unauthorized attempt";

      await expect(
        credentialStatusRegistry.connect(addr2).revokeCredential(
          credentialId,
          statusListId,
          reason
        )
      ).to.be.revertedWith("Only issuer can perform this action");
    });
  });

  describe("Credential Status Verification", function () {
    it("Should verify non-revoked credential status", async function () {
      const credentialId = "cred1";
      const statusListId = "verify-list1";
      const issuerDID = "did:ethr:verify-issuer1";
      
      const leaf = ethers.keccak256(ethers.solidityPacked(["string", "bool"], [credentialId, false]));
      const rootHash = leaf;
      
      await credentialStatusRegistry.connect(addr1).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        1,
        "ipfs://QmHash"
      );

      const proof = [];
      const index = 0;

      const isValid = await credentialStatusRegistry.verifyCredentialStatus(
        credentialId,
        statusListId,
        proof,
        index
      );
      expect(isValid).to.be.true;
    });

    it("Should return false for revoked credential", async function () {
      const credentialId = "cred-revoked";
      const statusListId = "verify-list2";
      const issuerDID = "did:ethr:verify-issuer2";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const reason = "Revoked";

      await credentialStatusRegistry.connect(addr1).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        100,
        "ipfs://QmHash"
      );

      await credentialStatusRegistry.connect(addr1).revokeCredential(
        credentialId,
        statusListId,
        reason
      );

      const proof = [];
      const index = 0;
      const isValid = await credentialStatusRegistry.verifyCredentialStatus(
        credentialId,
        statusListId,
        proof,
        index
      );
      expect(isValid).to.be.false;
    });
  });

  describe("Issuer Management", function () {
    it("Should register issuer address", async function () {
      const issuerDID = "did:ethr:issuer1";

      await credentialStatusRegistry.connect(addr1).registerIssuer(issuerDID, addr1.address);

      const issuerAddress = await credentialStatusRegistry.getIssuerAddress(issuerDID);
      expect(issuerAddress).to.equal(addr1.address);
    });

    it("Should update issuer address", async function () {
      const issuerDID = "did:ethr:issuer1";

      await credentialStatusRegistry.connect(addr1).registerIssuer(issuerDID, addr1.address);
      await credentialStatusRegistry.connect(addr1).updateIssuerAddress(issuerDID, addr2.address);

      const issuerAddress = await credentialStatusRegistry.getIssuerAddress(issuerDID);
      expect(issuerAddress).to.equal(addr2.address);
    });

    it("Should prevent unauthorized issuer address update", async function () {
      const issuerDID = "did:ethr:issuer1";

      await credentialStatusRegistry.connect(addr1).registerIssuer(issuerDID, addr1.address);

      await expect(
        credentialStatusRegistry.connect(addr2).updateIssuerAddress(issuerDID, addr2.address)
      ).to.be.revertedWith("Only current issuer can update");
    });
  });

  describe("Status List Deactivation", function () {
    beforeEach(async function () {
      const statusListId = "list1";
      const issuerDID = "did:ethr:issuer1";
      const rootHash = ethers.keccak256(ethers.toUtf8Bytes("root"));
      const listSize = 100;
      const statusListURI = "ipfs://QmHash";

      await credentialStatusRegistry.connect(addr1).createStatusList(
        statusListId,
        issuerDID,
        rootHash,
        listSize,
        statusListURI
      );
    });

    it("Should deactivate status list", async function () {
      const statusListId = "list1";

      await credentialStatusRegistry.connect(addr1).deactivateStatusList(statusListId);

      const statusList = await credentialStatusRegistry.getStatusList(statusListId);
      expect(statusList.isActive).to.be.false;
    });

    it("Should prevent operations on deactivated status list", async function () {
      const statusListId = "list1";
      const newRootHash = ethers.keccak256(ethers.toUtf8Bytes("newroot"));
      const revokedCount = 5;

      await credentialStatusRegistry.connect(addr1).deactivateStatusList(statusListId);

      await expect(
        credentialStatusRegistry.connect(addr1).updateStatusList(
          statusListId,
          newRootHash,
          revokedCount
        )
      ).to.be.revertedWith("Status list not active");
    });
  });
});

