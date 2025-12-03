const { createVerifiableCredentialJwt } = require("did-jwt-vc");
const { Resolver } = require("did-resolver");
const { getResolver } = require("ethr-did-resolver");

class CredentialIssuer {
  constructor(issuerDID, issuerPrivateKey, provider) {
    this.issuerDID = issuerDID;
    this.issuerPrivateKey = issuerPrivateKey;
    this.provider = provider;
    this.resolver = null;
    this.resolverPromise = this.initResolver();
    
    this.issuer = {
      did: issuerDID,
      signer: this.createSigner(issuerPrivateKey)
    };
  }

  async initResolver() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      
      const ethrResolver = getResolver({ 
        provider: this.provider,
        chainId: chainId.toString(),
        registry: undefined
      });
      this.resolver = new Resolver(ethrResolver);
      return this.resolver;
    } catch (error) {
      try {
        const ethrResolver = getResolver({ provider: this.provider });
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

  createSigner(privateKey) {
    const { ethers } = require("ethers");
    const wallet = new ethers.Wallet(privateKey);
    
    return async (data) => {
      try {
        const message = typeof data === "string" ? data : JSON.stringify(data);
        const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
        const signature = await wallet.signMessage(ethers.getBytes(messageHash));
        return signature;
      } catch (error) {
        const message = typeof data === "string" ? data : JSON.stringify(data);
        const signature = await wallet.signMessage(message);
        return signature;
      }
    };
  }

  async issueCredential(credentialData) {
    const {
      id,
      type,
      credentialSubject,
      expirationDate,
      issuanceDate = new Date().toISOString()
    } = credentialData;

    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1"
      ],
      id: id || `urn:uuid:${this.generateUUID()}`,
      type: type || ["VerifiableCredential", "AccessGrantCredential"],
      issuer: this.issuerDID,
      issuanceDate,
      expirationDate,
      credentialSubject: {
        id: credentialSubject.id || credentialSubject.did,
        ...credentialSubject
      }
    };

    try {
      await this.ensureResolver();
      const vcJwt = await createVerifiableCredentialJwt(credential, this.issuer);
      return {
        credential,
        jwt: vcJwt,
        id: credential.id
      };
    } catch (error) {
      throw new Error(`Failed to issue credential: ${error.message}`);
    }
  }

  async issueAccessGrantCredential(holderDID, accessGroups, expirationDays = 365) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);

    return await this.issueCredential({
      type: ["VerifiableCredential", "AccessGrantCredential"],
      credentialSubject: {
        id: holderDID,
        did: holderDID,
        accessGroups: accessGroups,
        role: "employee"
      },
      expirationDate: expirationDate.toISOString()
    });
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = CredentialIssuer;

