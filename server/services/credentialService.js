const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const IssuanceService = require("../../src/services/issuanceService");

class CredentialService {
  constructor(provider, contractAddresses) {
    this.provider = provider;
    this.contractAddresses = contractAddresses;
    
    if (!contractAddresses.didRegistry || contractAddresses.didRegistry === "") {
      throw new Error("DID_REGISTRY_ADDRESS is not set in .env file");
    }
    if (!contractAddresses.credentialStatusRegistry || contractAddresses.credentialStatusRegistry === "") {
      throw new Error("CREDENTIAL_STATUS_REGISTRY_ADDRESS is not set in .env file");
    }
    if (!contractAddresses.auditLog || contractAddresses.auditLog === "") {
      throw new Error("AUDIT_LOG_ADDRESS is not set in .env file");
    }
    
    const contracts = {
      didRegistry: new ethers.Contract(
        contractAddresses.didRegistry,
        JSON.parse(fs.readFileSync(path.join(__dirname, "../../artifacts/contracts/DIDRegistry.sol/DIDRegistry.json"))).abi,
        provider
      ),
      credentialStatusRegistry: new ethers.Contract(
        contractAddresses.credentialStatusRegistry,
        JSON.parse(fs.readFileSync(path.join(__dirname, "../../artifacts/contracts/CredentialStatusRegistry.sol/CredentialStatusRegistry.json"))).abi,
        provider
      ),
      auditLog: new ethers.Contract(
        contractAddresses.auditLog,
        JSON.parse(fs.readFileSync(path.join(__dirname, "../../artifacts/contracts/AuditLog.sol/AuditLog.json"))).abi,
        provider
      ),
    };
    
    this.issuanceService = new IssuanceService(provider, contracts, {});
  }

  async createStatusList(wallet, issuerDID, statusListId = null) {
    this.issuanceService.setSigner(wallet);
    return await this.issuanceService.createStatusListForIssuer(issuerDID, [], statusListId);
  }

  async issueCredential(wallet, issuerDID, issuerPrivateKey, holderDID, accessGroups, expirationDays = 365, statusListId = null) {
    this.issuanceService.setSigner(wallet);
    
    const groups = typeof accessGroups === "string" ? accessGroups.split(",").map(g => g.trim()).filter(g => g) : accessGroups;
    
    return await this.issuanceService.issueAccessGrantCredential(
      issuerDID,
      issuerPrivateKey,
      holderDID,
      groups,
      expirationDays,
      statusListId
    );
  }

  async revokeCredential(wallet, credentialId, statusListId, reason = "Revoked by issuer") {
    this.issuanceService.setSigner(wallet);
    return await this.issuanceService.revokeCredential(credentialId, statusListId, reason);
  }
}

module.exports = CredentialService;

