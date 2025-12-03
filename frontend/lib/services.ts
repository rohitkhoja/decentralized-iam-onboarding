import { ethers } from "ethers";
import { getDIDRegistry, getCredentialStatusRegistry, getAuditLog, CONTRACT_ADDRESSES } from "./contracts";

export interface ServiceConfig {
  provider: ethers.Provider;
  signer?: ethers.Signer;
  ipfsConfig?: {
    host?: string;
    port?: number;
    protocol?: string;
    projectId?: string;
    projectSecret?: string;
  };
}

export class DIDService {
  private provider: ethers.Provider;
  private didRegistry: ethers.Contract;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.didRegistry = getDIDRegistry(provider);
  }

  async registerDID(signer: ethers.Signer, did: string, publicKey: Uint8Array | string, keyType: string = "EcdsaSecp256k1VerificationKey2019") {
    const didRegistryWithSigner = this.didRegistry.connect(signer);
    const publicKeyBytes = typeof publicKey === "string" ? ethers.toUtf8Bytes(publicKey) : publicKey;
    const tx = await (didRegistryWithSigner as any).registerDID(did, publicKeyBytes, keyType);
    await tx.wait();
    return { did, publicKey: publicKeyBytes, keyType, txHash: tx.hash };
  }

  async rotateKey(signer: ethers.Signer, did: string, newPublicKey: Uint8Array | string, keyType: string = "EcdsaSecp256k1VerificationKey2019") {
    const didRegistryWithSigner = this.didRegistry.connect(signer);
    const publicKeyBytes = typeof newPublicKey === "string" ? ethers.toUtf8Bytes(newPublicKey) : newPublicKey;
    const tx = await (didRegistryWithSigner as any).rotateKey(did, publicKeyBytes, keyType);
    await tx.wait();
    return { did, newPublicKey: publicKeyBytes, keyType, txHash: tx.hash };
  }

  async deactivateDID(signer: ethers.Signer, did: string) {
    const didRegistryWithSigner = this.didRegistry.connect(signer);
    const tx = await (didRegistryWithSigner as any).deactivateDID(did);
    await tx.wait();
    return { did, txHash: tx.hash };
  }

  async getDIDDocument(did: string) {
    return await this.didRegistry.getDIDDocument(did);
  }

  async isDIDActive(did: string) {
    return await this.didRegistry.isDIDActive(did);
  }

  async getPublicKey(did: string) {
    return await this.didRegistry.getPublicKey(did);
  }

  generateDID(method: string = "ethr", identifier?: string) {
    if (!identifier) {
      const wallet = ethers.Wallet.createRandom();
      identifier = wallet.address;
    }
    return `did:${method}:${identifier}`;
  }

  async resolveDID(did: string) {
    const didDoc = await this.getDIDDocument(did);
    if (!didDoc || didDoc.controller === ethers.ZeroAddress) {
      return null;
    }
    return {
      did: didDoc.did,
      controller: didDoc.controller,
      publicKey: didDoc.publicKey,
      keyType: didDoc.keyType,
      isActive: didDoc.isActive,
      createdAt: didDoc.createdAt,
      updatedAt: didDoc.updatedAt
    };
  }
}

export class IPFSService {
  private ipfsClient: any;
  private initialized: boolean = false;
  private config: any;

  constructor(config?: { host?: string; port?: number; protocol?: string; projectId?: string; projectSecret?: string }) {
    this.config = config;
    if (typeof window !== "undefined") {
      this.initializeIPFS(config);
    }
  }

  private async initializeIPFS(config?: any) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const { create } = await import("ipfs-http-client");
      const ipfsConfig: any = {
        host: config?.host || process.env.NEXT_PUBLIC_IPFS_HOST || "ipfs.infura.io",
        port: config?.port || 5001,
        protocol: config?.protocol || "https",
        headers: {}
      };

      if (config?.projectId && config?.projectSecret) {
        const auth = btoa(`${config.projectId}:${config.projectSecret}`);
        ipfsConfig.headers.authorization = `Basic ${auth}`;
      }

      this.ipfsClient = create(ipfsConfig);
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
    }
  }

  async store(data: any) {
    if (typeof window === "undefined") {
      throw new Error("IPFS can only be used in browser");
    }

    if (!this.initialized || !this.ipfsClient) {
      if (!this.initialized) {
        await this.initializeIPFS(this.config);
      }
      if (!this.initialized || !this.ipfsClient) {
        throw new Error("IPFS client not initialized");
      }
    }

    const dataToStore = typeof data === "string" ? data : JSON.stringify(data);
    const result = await this.ipfsClient.add(dataToStore);
    return {
      cid: result.cid.toString(),
      path: result.path,
      size: result.size
    };
  }

  async retrieve(cid: string) {
    if (typeof window === "undefined") {
      throw new Error("IPFS can only be used in browser");
    }

    if (!this.initialized || !this.ipfsClient) {
      if (!this.initialized) {
        await this.initializeIPFS(this.config);
      }
      if (!this.initialized || !this.ipfsClient) {
        throw new Error("IPFS client not initialized");
      }
    }

    const chunks = [];
    for await (const chunk of this.ipfsClient.cat(cid)) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString();
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  getIPFSUri(cid: string) {
    return `ipfs://${cid}`;
  }

  getHTTPUri(cid: string, gateway: string = "https://ipfs.io/ipfs/") {
    return `${gateway}${cid}`;
  }
}

export class CredentialIssuanceService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private credentialStatusRegistry: ethers.Contract;
  private ipfsService: IPFSService;

  constructor(provider: ethers.Provider, signer: ethers.Signer | undefined, ipfsService: IPFSService) {
    this.provider = provider;
    this.signer = signer;
    this.credentialStatusRegistry = getCredentialStatusRegistry(signer || provider);
    this.ipfsService = ipfsService;
  }

  setSigner(signer: ethers.Signer) {
    this.signer = signer;
    this.credentialStatusRegistry = getCredentialStatusRegistry(signer);
  }

  async issueCredential(
    issuerDID: string,
    issuerPrivateKey: string,
    holderDID: string,
    accessGroups: string[],
    expirationDays: number = 365,
    statusListId?: string
  ) {
    if (!this.signer) {
      throw new Error("Signer not set");
    }

    try {
      const { createVerifiableCredentialJwt } = await import("did-jwt-vc");
      const { ES256KSigner } = await import("did-jwt");

      const wallet = new ethers.Wallet(issuerPrivateKey);
      const signer = ES256KSigner(ethers.getBytes(wallet.privateKey));

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/2018/credentials/examples/v1"
        ],
        id: `urn:uuid:${this.generateUUID()}`,
        type: ["VerifiableCredential", "AccessGrantCredential"],
        issuer: issuerDID,
        issuanceDate: new Date().toISOString(),
        expirationDate: expirationDate.toISOString(),
        credentialSubject: {
          id: holderDID,
          did: holderDID,
          accessGroups: accessGroups,
          role: "employee"
        }
      };

      const vcJwt = await createVerifiableCredentialJwt(
        credential,
        {
          did: issuerDID,
          signer: signer
        }
      );

      const credentialMetadata = {
        id: credential.id,
        type: credential.type,
        issuer: issuerDID,
        holder: holderDID,
        issuanceDate: credential.issuanceDate,
        expirationDate: credential.expirationDate,
        accessGroups: accessGroups
      };

      const cid = await this.ipfsService.store(credentialMetadata);
      const credentialURI = this.ipfsService.getIPFSUri(cid.cid);

      if (statusListId) {
        const statusList = await this.credentialStatusRegistry.getStatusList(statusListId);
        const allCredentialIds = await this.getAllCredentialIdsFromStatusList(statusList.statusListURI);

        if (!allCredentialIds.includes(credential.id)) {
          allCredentialIds.push(credential.id);
          await this.updateStatusList(statusListId, allCredentialIds, new Set());
        }
      }

      return {
        credential,
        jwt: vcJwt,
        id: credential.id,
        ipfsURI: credentialURI,
        cid: cid.cid
      };
    } catch (error: any) {
      throw new Error(`Failed to issue credential: ${error.message}`);
    }
  }

  async getAllCredentialIdsFromStatusList(statusListURI: string) {
    try {
      const cid = statusListURI.replace("ipfs://", "");
      const statusList = await this.ipfsService.retrieve(cid);
      return statusList.credentialIds || [];
    } catch (error) {
      return [];
    }
  }

  async createStatusList(issuerDID: string, initialCredentialIds: string[] = []) {
    if (!this.signer) {
      throw new Error("Signer not set");
    }

    const statusListId = `status-list-${Date.now()}`;

    const { MerkleTree } = await import("merkletreejs");
    const leaves = initialCredentialIds.map(id =>
      ethers.keccak256(ethers.solidityPacked(["string", "bool"], [id, false]))
    );
    const tree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
    const rootHash = tree.getHexRoot();

    const statusList = {
      id: statusListId,
      type: "StatusList2021",
      statusPurpose: "revocation",
      credentialIds: initialCredentialIds,
      merkleRoot: rootHash
    };

    const cid = await this.ipfsService.store(statusList);
    const statusListURI = this.ipfsService.getIPFSUri(cid.cid);

    const registryWithSigner = this.credentialStatusRegistry.connect(this.signer);
    const tx = await (registryWithSigner as any).createStatusList(
      statusListId,
      issuerDID,
      rootHash,
      initialCredentialIds.length || 100,
      statusListURI
    );
    await tx.wait();

    return {
      statusListId,
      rootHash,
      cid: cid.cid,
      statusListURI,
      txHash: tx.hash
    };
  }

  async updateStatusList(statusListId: string, credentialIds: string[], revokedIds: Set<string>) {
    if (!this.signer) {
      throw new Error("Signer not set");
    }

    const { MerkleTree } = await import("merkletreejs");
    const leaves = credentialIds.map(id =>
      ethers.keccak256(ethers.solidityPacked(["string", "bool"], [id, revokedIds.has(id)]))
    );
    const tree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
    const newRootHash = tree.getHexRoot();

    const statusList = {
      id: statusListId,
      type: "StatusList2021",
      statusPurpose: "revocation",
      credentialIds: credentialIds,
      merkleRoot: newRootHash
    };

    const existingList = await this.credentialStatusRegistry.getStatusList(statusListId);
    const oldCid = existingList.statusListURI.replace("ipfs://", "");

    const cid = await this.ipfsService.store(statusList);
    const statusListURI = this.ipfsService.getIPFSUri(cid.cid);

    const registryWithSigner = this.credentialStatusRegistry.connect(this.signer);
    const tx = await (registryWithSigner as any).updateStatusList(
      statusListId,
      newRootHash,
      revokedIds.size
    );
    await tx.wait();

    return {
      statusListId,
      rootHash: newRootHash,
      cid: cid.cid,
      statusListURI,
      revokedCount: revokedIds.size,
      txHash: tx.hash
    };
  }

  async revokeCredential(credentialId: string, statusListId: string, reason: string = "Revoked by issuer") {
    if (!this.signer) {
      throw new Error("Signer not set");
    }

    const registryWithSigner = this.credentialStatusRegistry.connect(this.signer);
    const tx = await (registryWithSigner as any).revokeCredential(
      credentialId,
      statusListId,
      reason
    );
    await tx.wait();

    const statusList = await this.credentialStatusRegistry.getStatusList(statusListId);
    const allCredentialIds = await this.getAllCredentialIdsFromStatusList(statusList.statusListURI);
    const revokedIds = new Set([credentialId]);

    await this.updateStatusList(statusListId, allCredentialIds, revokedIds);

    return {
      credentialId,
      statusListId,
      txHash: tx.hash
    };
  }

  private generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export class CredentialVerificationService {
  private provider: ethers.Provider;
  private credentialStatusRegistry: ethers.Contract;
  private didRegistry: ethers.Contract;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.credentialStatusRegistry = getCredentialStatusRegistry(provider);
    this.didRegistry = getDIDRegistry(provider);
  }

  async verifyCredentialJWT(vcJwt: string) {
    try {
      const { verifyCredential } = await import("did-jwt-vc");
      const { Resolver } = await import("did-resolver");

      let ethrResolver: any;
      try {
        const { getResolver } = await import("ethr-did-resolver");
        ethrResolver = getResolver({ provider: this.provider as any });
      } catch (error) {
        ethrResolver = {};
      }

      const resolver = new Resolver(ethrResolver);
      const verified = await verifyCredential(vcJwt, resolver);

      return {
        valid: true,
        credential: verified.verifiableCredential,
        payload: verified.payload
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async verifyCredentialExpiration(credential: any) {
    if (!credential.expirationDate) {
      return { expired: false };
    }
    const expirationDate = new Date(credential.expirationDate);
    const now = new Date();
    const expired = now > expirationDate;
    return {
      expired,
      expirationDate: credential.expirationDate,
      daysUntilExpiration: expired ? 0 : Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    };
  }

  async verifyCredentialStatus(credentialId: string, statusListId: string) {
    try {
      const isRevoked = await this.credentialStatusRegistry.isRevoked(credentialId);
      return {
        revoked: isRevoked,
        credentialId
      };
    } catch (error: any) {
      return {
        revoked: false,
        error: error.message
      };
    }
  }

  async verifyCredential(vcJwt: string, statusListId?: string, proof?: string[], index?: number) {
    const jwtVerification = await this.verifyCredentialJWT(vcJwt);

    if (!jwtVerification.valid) {
      return {
        valid: false,
        errors: [jwtVerification.error],
        credential: null
      };
    }

    const credential = jwtVerification.credential;
    if (!credential) {
      return {
        valid: false,
        errors: ["Credential is missing"],
        credential: null
      };
    }
    const credentialId = credential.id;

    const expirationCheck = await this.verifyCredentialExpiration(credential);
    if (expirationCheck.expired) {
      return {
        valid: false,
        errors: ["Credential has expired"],
        credential
      };
    }

    const issuerDID = credential.issuer;
    const issuerDoc = await this.didRegistry.getDIDDocument(issuerDID);
    if (!issuerDoc || issuerDoc.controller === ethers.ZeroAddress || !issuerDoc.isActive) {
      return {
        valid: false,
        errors: ["Issuer DID is not active or does not exist"],
        credential
      };
    }

    if (statusListId) {
      const statusCheck = await this.verifyCredentialStatus(credentialId as string, statusListId as string);
      if (statusCheck.revoked) {
        return {
          valid: false,
          errors: ["Credential has been revoked"],
          credential
        };
      }

      if (proof && index !== undefined) {
        const isValid = await this.credentialStatusRegistry.verifyCredentialStatus(
          credentialId,
          statusListId,
          proof,
          index
        );
        if (!isValid) {
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

  async verifyPresentation(vpJwt: string, requiredFields: string[] = []) {
    try {
      const { verifyPresentation } = await import("did-jwt-vc");
      const { Resolver } = await import("did-resolver");

      let ethrResolver: any;
      try {
        const { getResolver } = await import("ethr-did-resolver");
        ethrResolver = getResolver({ provider: this.provider as any });
      } catch (error) {
        ethrResolver = {};
      }

      const resolver = new Resolver(ethrResolver);
      const verified = await verifyPresentation(vpJwt, resolver);

      const credentials = verified.verifiablePresentation.verifiableCredential;
      const verificationResults = [];

      if (credentials) {
        for (const cred of credentials) {
          const vcJwt = typeof cred === "string" ? cred : (cred as any).proof?.jwt;
          const result = await this.verifyCredential(vcJwt);
          verificationResults.push(result);
        }
      }

      const allValid = verificationResults.every(r => r.valid);
      const hasRequiredFields = this.checkRequiredFields(verified.verifiablePresentation, requiredFields);

      return {
        valid: allValid && hasRequiredFields,
        presentation: verified.verifiablePresentation,
        credentials: verificationResults,
        errors: verificationResults.filter(r => !r.valid).flatMap(r => r.errors)
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message],
        presentation: null
      };
    }
  }

  private checkRequiredFields(presentation: any, requiredFields: string[]) {
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

export class PresentationService {
  private holderDID: string;
  private holderPrivateKey: string;

  constructor(holderDID: string, holderPrivateKey: string) {
    this.holderDID = holderDID;
    this.holderPrivateKey = holderPrivateKey;
  }

  async createPresentation(credentials: string[], options: { id?: string; type?: string; nonce?: string; domain?: string } = {}) {
    try {
      const { createVerifiablePresentationJwt } = await import("did-jwt-vc");
      const { ES256KSigner } = await import("did-jwt");

      const wallet = new ethers.Wallet(this.holderPrivateKey);
      const signer = ES256KSigner(ethers.getBytes(wallet.privateKey));

      const presentation = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: [options.type || "VerifiablePresentation"],
        verifiableCredential: credentials,
        holder: this.holderDID
      };

      if (options.id) {
        (presentation as any).id = options.id;
      }

      const vpJwt = await createVerifiablePresentationJwt(
        presentation,
        {
          did: this.holderDID,
          signer: signer
        },
        {
          nonce: options.nonce,
          domain: options.domain
        }
      );

      return {
        presentation,
        jwt: vpJwt,
        id: (presentation as any).id || `urn:uuid:${this.generateUUID()}`
      };
    } catch (error: any) {
      throw new Error(`Failed to create presentation: ${error.message}`);
    }
  }

  private generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export function initializeServices(config: ServiceConfig) {
  const didService = new DIDService(config.provider);
  const ipfsService = new IPFSService(config.ipfsConfig);
  const issuanceService = config.signer
    ? new CredentialIssuanceService(config.provider, config.signer, ipfsService)
    : undefined;
  const verificationService = new CredentialVerificationService(config.provider);

  return {
    didService,
    ipfsService,
    issuanceService,
    verificationService
  };
}

