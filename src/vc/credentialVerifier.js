const { verifyCredential } = require("did-jwt-vc");
const { Resolver } = require("did-resolver");
const { getResolver } = require("did-resolver");

class CredentialVerifier {
  constructor(provider) {
    this.provider = provider;
    this.resolver = null;
    this.resolverPromise = this.initResolver();
  }

  async initResolver() {
    try {
      const { getResolver: getEthrResolver } = require("ethr-did-resolver");
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      
      const ethrResolver = getEthrResolver({ 
        provider: this.provider,
        chainId: chainId.toString(),
        registry: undefined
      });
      this.resolver = new Resolver(ethrResolver);
      return this.resolver;
    } catch (error) {
      try {
        const { getResolver: getEthrResolver } = require("ethr-did-resolver");
        const ethrResolver = getEthrResolver({ provider: this.provider });
        this.resolver = new Resolver(ethrResolver);
        return this.resolver;
      } catch (err) {
        this.resolver = new Resolver({});
        return this.resolver;
      }
    }
  }

  async ensureResolver() {
    if (!this.resolver && this.resolverPromise) {
      await this.resolverPromise;
    }
    return this.resolver;
  }

  async verifyCredentialJWT(vcJwt) {
    try {
      await this.ensureResolver();
      
      if (!this.resolver) {
        return {
          valid: false,
          error: "Resolver not initialized"
        };
      }
      
      const verified = await verifyCredential(vcJwt, this.resolver);
      return {
        valid: true,
        credential: verified.verifiableCredential,
        payload: verified.payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async verifyCredentialExpiration(credential) {
    if (!credential.expirationDate) {
      return { expired: false };
    }

    const expirationDate = new Date(credential.expirationDate);
    const now = new Date();
    const expired = now > expirationDate;

    return {
      expired,
      expirationDate: credential.expirationDate,
      daysUntilExpiration: expired ? 0 : Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24))
    };
  }

  async verifyCredentialStatus(credentialId, credentialStatusRegistry, statusListId) {
    try {
      const isRevoked = await credentialStatusRegistry.isRevoked(credentialId);
      return {
        revoked: isRevoked,
        credentialId
      };
    } catch (error) {
      return {
        revoked: false,
        error: error.message
      };
    }
  }

  async verifyCredentialWithMerkleProof(
    credentialId,
    credentialStatusRegistry,
    statusListId,
    proof,
    index
  ) {
    try {
      const isValid = await credentialStatusRegistry.verifyCredentialStatus(
        credentialId,
        statusListId,
        proof,
        index
      );
      return {
        valid: isValid,
        credentialId
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async fullVerification(vcJwt, credentialStatusRegistry, statusListId, proof, index) {
    const jwtVerification = await this.verifyCredentialJWT(vcJwt);
    
    if (!jwtVerification.valid) {
      return {
        valid: false,
        errors: [jwtVerification.error]
      };
    }

    const expirationCheck = await this.verifyCredentialExpiration(jwtVerification.credential);
    if (expirationCheck.expired) {
      return {
        valid: false,
        errors: ["Credential has expired"]
      };
    }

    const statusCheck = await this.verifyCredentialStatus(
      jwtVerification.credential.id,
      credentialStatusRegistry,
      statusListId
    );
    if (statusCheck.revoked) {
      return {
        valid: false,
        errors: ["Credential has been revoked"]
      };
    }

    if (proof && index !== undefined) {
      const merkleVerification = await this.verifyCredentialWithMerkleProof(
        jwtVerification.credential.id,
        credentialStatusRegistry,
        statusListId,
        proof,
        index
      );
      if (!merkleVerification.valid) {
        return {
          valid: false,
          errors: ["Merkle proof verification failed"]
        };
      }
    }

    return {
      valid: true,
      credential: jwtVerification.credential,
      expiration: expirationCheck,
      status: statusCheck
    };
  }
}

module.exports = CredentialVerifier;

