const { ethers } = require("ethers");
const CredentialVerifier = require("../../src/vc/credentialVerifier");
const fs = require("fs");
const path = require("path");

class VerificationService {
  constructor(provider, contractAddresses) {
    this.provider = provider;
    this.contractAddresses = contractAddresses;

    if (!contractAddresses.didRegistry || contractAddresses.didRegistry === "") {
      throw new Error("DID_REGISTRY_ADDRESS is not set in .env file");
    }
    if (!contractAddresses.credentialStatusRegistry || contractAddresses.credentialStatusRegistry === "") {
      throw new Error("CREDENTIAL_STATUS_REGISTRY_ADDRESS is not set in .env file");
    }

    const didRegistryABI = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../artifacts/contracts/DIDRegistry.sol/DIDRegistry.json"))
    ).abi;

    const credentialStatusRegistryABI = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../artifacts/contracts/CredentialStatusRegistry.sol/CredentialStatusRegistry.json"))
    ).abi;

    this.didRegistry = new ethers.Contract(
      contractAddresses.didRegistry,
      didRegistryABI,
      provider
    );

    this.credentialStatusRegistry = new ethers.Contract(
      contractAddresses.credentialStatusRegistry,
      credentialStatusRegistryABI,
      provider
    );

    const auditLogABI = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../artifacts/contracts/AuditLog.sol/AuditLog.json"))
    ).abi;

    this.auditLog = new ethers.Contract(
      contractAddresses.auditLog,
      auditLogABI,
      provider
    );
  }

  async logAccessAttempt(actorDID, actorAddress, resourceId, accessLevel, success) {
    try {
      const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;
      if (!issuerPrivateKey) {
        return;
      }
      const wallet = new ethers.Wallet(issuerPrivateKey, this.provider);
      const auditLogWithSigner = this.auditLog.connect(wallet);

      const eventType = success ? 3 : 4;
      const details = JSON.stringify({ resourceId, accessLevel });

      const tx = await auditLogWithSigner.logEvent(
        eventType,
        actorDID,
        actorAddress,
        "",
        "",
        details
      );

      await tx.wait();
      return tx.hash;
    } catch (error) {
    }
  }

  async verifyCredential(jwt, statusListId = null) {
    const verifier = new CredentialVerifier(this.provider);

    try {
      const jwtVerification = await verifier.verifyCredentialJWT(jwt);

      if (!jwtVerification.valid) {
        return {
          valid: false,
          errors: [jwtVerification.error || "JWT verification failed"],
        };
      }

      const expirationCheck = await verifier.verifyCredentialExpiration(jwtVerification.credential);
      if (expirationCheck.expired) {
        return {
          valid: false,
          errors: ["Credential has expired"],
          credential: jwtVerification.credential,
          expiration: expirationCheck,
        };
      }

      let statusCheck = { revoked: false };
      if (statusListId) {
        statusCheck = await verifier.verifyCredentialStatus(
          jwtVerification.credential.id,
          this.credentialStatusRegistry,
          statusListId
        );
      }

      if (statusCheck.revoked) {
        return {
          valid: false,
          errors: ["Credential has been revoked"],
          credential: jwtVerification.credential,
          expiration: expirationCheck,
          status: statusCheck,
        };
      }

      return {
        valid: true,
        credential: jwtVerification.credential,
        expiration: expirationCheck,
        status: statusCheck,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  async verifyPresentation(jwt) {
    const verifier = new CredentialVerifier(this.provider, {
      didRegistry: this.didRegistry,
      credentialStatusRegistry: this.credentialStatusRegistry,
    });

    return await verifier.verifyPresentation(jwt);
  }
}

module.exports = VerificationService;

