const CredentialVerifier = require("../vc/credentialVerifier");
const DIDManager = require("../did/didManager");

class VerificationService {
  constructor(provider, contracts) {
    this.provider = provider;
    this.credentialStatusRegistry = contracts.credentialStatusRegistry;
    this.didRegistry = contracts.didRegistry;
    
    this.verifier = new CredentialVerifier(provider);
    this.didManager = new DIDManager(
      provider,
      contracts.didRegistry.address,
      contracts.didRegistry.interface
    );
  }

  async verifyCredential(vcJwt, statusListId = null, proof = null, index = null) {
    const jwtVerification = await this.verifier.verifyCredentialJWT(vcJwt);
    
    if (!jwtVerification.valid) {
      return {
        valid: false,
        errors: [jwtVerification.error],
        credential: null
      };
    }

    const credential = jwtVerification.credential;
    const credentialId = credential.id;

    const expirationCheck = await this.verifier.verifyCredentialExpiration(credential);
    if (expirationCheck.expired) {
      return {
        valid: false,
        errors: ["Credential has expired"],
        credential
      };
    }

    const issuerDID = credential.issuer;
    const issuerDoc = await this.didManager.resolveDID(issuerDID);
    if (!issuerDoc || !issuerDoc.isActive) {
      return {
        valid: false,
        errors: ["Issuer DID is not active or does not exist"],
        credential
      };
    }

    if (statusListId) {
      const statusCheck = await this.verifier.verifyCredentialStatus(
        credentialId,
        this.credentialStatusRegistry,
        statusListId
      );
      
      if (statusCheck.revoked) {
        return {
          valid: false,
          errors: ["Credential has been revoked"],
          credential
        };
      }

      if (proof && index !== undefined) {
        const merkleVerification = await this.verifier.verifyCredentialWithMerkleProof(
          credentialId,
          this.credentialStatusRegistry,
          statusListId,
          proof,
          index
        );
        
        if (!merkleVerification.valid) {
          return {
            valid: false,
            errors: ["Merkle proof verification failed"],
            credential
          };
        }
      }
    }

    return {
      valid: true,
      credential,
      expiration: expirationCheck,
      issuer: issuerDoc,
      errors: []
    };
  }

  async verifyPresentation(vpJwt, requiredFields = []) {
    try {
      const { verifyPresentation } = require("did-jwt-vc");
      const { Resolver } = require("did-resolver");
      
      let ethrResolver;
      try {
        const { getResolver } = require("ethr-did-resolver");
        ethrResolver = getResolver({ provider: this.provider });
      } catch (error) {
        ethrResolver = {};
      }
      
      const resolver = new Resolver(ethrResolver);
      const verified = await verifyPresentation(vpJwt, resolver);

      const credentials = verified.verifiablePresentation.verifiableCredential;
      const verificationResults = [];

      for (const cred of credentials) {
        const vcJwt = typeof cred === "string" ? cred : cred.proof.jwt;
        const result = await this.verifyCredential(vcJwt);
        verificationResults.push(result);
      }

      const allValid = verificationResults.every(r => r.valid);
      const hasRequiredFields = this.checkRequiredFields(verified.verifiablePresentation, requiredFields);

      return {
        valid: allValid && hasRequiredFields,
        presentation: verified.verifiablePresentation,
        credentials: verificationResults,
        errors: verificationResults.filter(r => !r.valid).flatMap(r => r.errors)
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        presentation: null
      };
    }
  }

  checkRequiredFields(presentation, requiredFields) {
    if (requiredFields.length === 0) {
      return true;
    }

    const credentials = presentation.verifiableCredential || [];
    for (const cred of credentials) {
      const subject = cred.credentialSubject || {};
      for (const field of requiredFields) {
        if (subject[field] === undefined) {
          return false;
        }
      }
    }
    return true;
  }
}

module.exports = VerificationService;

