const CredentialIssuer = require("../vc/credentialIssuer");
const DIDManager = require("../did/didManager");
const IPFSClient = require("../ipfs/ipfsClient");
const StatusListService = require("./statusListService");

class IssuanceService {
  constructor(provider, contracts, ipfsConfig = {}) {
    this.provider = provider;
    this.didRegistry = contracts.didRegistry;
    this.credentialStatusRegistry = contracts.credentialStatusRegistry;
    this.auditLog = contracts.auditLog;
    
    this.ipfsClient = new IPFSClient(ipfsConfig);
    this.statusListService = null;
  }

  setSigner(signer) {
    this.signer = signer;
    this.statusListService = new StatusListService(
      this.ipfsClient,
      this.credentialStatusRegistry,
      signer
    );
  }

  async issueAccessGrantCredential(
    issuerDID,
    issuerPrivateKey,
    holderDID,
    accessGroups,
    expirationDays = 365,
    statusListId = null
  ) {
    if (!this.signer) {
      throw new Error("Signer not set. Call setSigner() first.");
    }

    const credentialIssuer = new CredentialIssuer(issuerDID, issuerPrivateKey, this.provider);
    
    const credential = await credentialIssuer.issueAccessGrantCredential(
      holderDID,
      accessGroups,
      expirationDays
    );

    const credentialMetadata = {
      id: credential.id,
      type: credential.credential.type,
      issuer: issuerDID,
      holder: holderDID,
      issuanceDate: credential.credential.issuanceDate,
      expirationDate: credential.credential.expirationDate,
      accessGroups: credential.credential.credentialSubject.accessGroups
    };

    const cid = await this.ipfsClient.store(credentialMetadata);
    const credentialURI = this.ipfsClient.getIPFSUri(cid.cid);

    if (statusListId) {
      try {
        const statusList = await this.credentialStatusRegistry.getStatusList(statusListId);
        const statusListIdValue = statusList.statusListId;
        if (statusListIdValue && statusListIdValue.length > 0 && statusListIdValue !== "") {
          const allCredentialIds = await this.getAllCredentialIdsFromStatusList(statusList.statusListURI || "");
          
          if (!allCredentialIds.includes(credential.id)) {
            allCredentialIds.push(credential.id);
            const revokedIds = new Set();
            
            await this.statusListService.updateStatusList(
              statusListId,
              allCredentialIds,
              revokedIds,
              { pin: true }
            );
          }
        }
      } catch (error) {
      }
    }

    return {
      credential: credential.credential,
      jwt: credential.jwt,
      id: credential.id,
      ipfsURI: credentialURI,
      cid: cid.cid
    };
  }

  async getAllCredentialIdsFromStatusList(statusListURI) {
    try {
      const cid = statusListURI.replace("ipfs://", "");
      const statusList = await this.ipfsClient.retrieve(cid);
      return statusList.credentialIds || [];
    } catch (error) {
      return [];
    }
  }

  async createStatusListForIssuer(issuerDID, initialCredentialIds = [], statusListId = null) {
    if (!this.signer) {
      throw new Error("Signer not set. Call setSigner() first.");
    }

    const listId = statusListId || `status-list-${Date.now()}`;
    
    const result = await this.statusListService.createStatusList(
      listId,
      issuerDID,
      initialCredentialIds,
      { pin: true }
    );

    return result;
  }

  async revokeCredential(credentialId, statusListId, reason = "Revoked by issuer") {
    if (!this.signer) {
      throw new Error("Signer not set. Call setSigner() first.");
    }

    const registryWithSigner = this.credentialStatusRegistry.connect(this.signer);
    const tx = await registryWithSigner.revokeCredential(
      credentialId,
      statusListId,
      reason
    );
    await tx.wait();

    const statusList = await this.credentialStatusRegistry.getStatusList(statusListId);
    const allCredentialIds = await this.getAllCredentialIdsFromStatusList(statusList.statusListURI);
    const revokedIds = new Set([credentialId]);

    await this.statusListService.updateStatusList(
      statusListId,
      allCredentialIds,
      revokedIds,
      { pin: true, unpinOld: false }
    );

    return {
      credentialId,
      statusListId,
      txHash: tx.hash
    };
  }
}

module.exports = IssuanceService;

