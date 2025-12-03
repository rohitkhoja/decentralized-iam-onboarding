const { createVerifiablePresentationJwt, Holder } = require("did-jwt-vc");

class PresentationBuilder {
  constructor(holderDID, holderPrivateKey) {
    this.holderDID = holderDID;
    this.holderPrivateKey = holderPrivateKey;
    
    this.holder = new Holder({
      did: holderDID,
      signer: this.createSigner(holderPrivateKey)
    });
  }

  createSigner(privateKey) {
    return async (data) => {
      const { ethers } = require("ethers");
      const wallet = new ethers.Wallet(privateKey);
      return wallet.signMessage(data);
    };
  }

  async createPresentation(credentials, options = {}) {
    const {
      id,
      type = "VerifiablePresentation",
      nonce,
      domain
    } = options;

    const verifiableCredentials = Array.isArray(credentials) ? credentials : [credentials];

    const presentation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: [type],
      verifiableCredential: verifiableCredentials,
      holder: this.holderDID
    };

    if (id) {
      presentation.id = id;
    }

    try {
      const vpJwt = await createVerifiablePresentationJwt(
        presentation,
        this.holder,
        {
          nonce,
          domain
        }
      );

      return {
        presentation,
        jwt: vpJwt,
        id: presentation.id || `urn:uuid:${this.generateUUID()}`
      };
    } catch (error) {
      throw new Error(`Failed to create presentation: ${error.message}`);
    }
  }

  async createSelectiveDisclosurePresentation(credentials, disclosedFields) {
    const selectiveCredentials = credentials.map(cred => {
      const disclosed = {};
      disclosedFields.forEach(field => {
        if (cred.credentialSubject[field] !== undefined) {
          disclosed[field] = cred.credentialSubject[field];
        }
      });
      return {
        ...cred,
        credentialSubject: {
          id: cred.credentialSubject.id,
          ...disclosed
        }
      };
    });

    return await this.createPresentation(selectiveCredentials);
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = PresentationBuilder;

