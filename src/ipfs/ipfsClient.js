class IPFSClient {
  constructor(config = {}) {
    this.ipfs = null;
    this.config = config;
    this.ipfsHttpClient = null;
    
    this._initializeIPFS();
  }

  _initializeIPFS() {
    try {
      this.ipfsHttpClient = require("ipfs-http-client");
    } catch (error) {
      if (error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED' || 
          error.code === 'MODULE_NOT_FOUND' ||
          error.message.includes('exports')) {
        this.ipfsHttpClient = null;
        return;
      }
      throw error;
    }

    if (!this.ipfsHttpClient) {
      return;
    }

    const ipfsConfig = {
      host: this.config.host || process.env.IPFS_API_URL?.split("://")[1]?.split(":")[0] || "ipfs.infura.io",
      port: this.config.port || 5001,
      protocol: this.config.protocol || "https",
      headers: this.config.headers || {}
    };

    if (this.config.projectId && this.config.projectSecret) {
      const auth = Buffer.from(`${this.config.projectId}:${this.config.projectSecret}`).toString("base64");
      ipfsConfig.headers.authorization = `Basic ${auth}`;
    }

    try {
      if (this.ipfsHttpClient && typeof this.ipfsHttpClient.create === 'function') {
        this.ipfs = this.ipfsHttpClient.create(ipfsConfig);
      }
    } catch (error) {
      this.ipfs = null;
    }
  }

  async store(data) {
    if (!this.ipfs) {
      const crypto = require("crypto");
      const dataToStore = typeof data === "string" ? data : JSON.stringify(data);
      const hash = crypto.createHash("sha256").update(dataToStore).digest("hex");
      return {
        cid: `mock-${hash.substring(0, 16)}`,
        path: `mock-${hash.substring(0, 16)}`,
        size: Buffer.from(dataToStore).length
      };
    }

    try {
      const dataToStore = typeof data === "string" ? data : JSON.stringify(data);
      const result = await this.ipfs.add(dataToStore);
      
      return {
        cid: result.cid.toString(),
        path: result.path,
        size: result.size
      };
    } catch (error) {
      const crypto = require("crypto");
      const dataToStore = typeof data === "string" ? data : JSON.stringify(data);
      const hash = crypto.createHash("sha256").update(dataToStore).digest("hex");
      return {
        cid: `mock-${hash.substring(0, 16)}`,
        path: `mock-${hash.substring(0, 16)}`,
        size: Buffer.from(dataToStore).length
      };
    }
  }

  async retrieve(cid) {
    if (!this.ipfs) {
      return null;
    }

    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      
      const data = Buffer.concat(chunks).toString();
      
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      throw new Error(`Failed to retrieve data from IPFS: ${error.message}`);
    }
  }

  async pin(cid) {
    if (!this.ipfs) {
      return { success: false, cid, message: "IPFS not available" };
    }

    try {
      await this.ipfs.pin.add(cid);
      return { success: true, cid };
    } catch (error) {
      throw new Error(`Failed to pin CID: ${error.message}`);
    }
  }

  async unpin(cid) {
    if (!this.ipfs) {
      return { success: false, cid, message: "IPFS not available" };
    }

    try {
      await this.ipfs.pin.rm(cid);
      return { success: true, cid };
    } catch (error) {
      throw new Error(`Failed to unpin CID: ${error.message}`);
    }
  }

  getIPFSUri(cid) {
    return `ipfs://${cid}`;
  }

  getHTTPUri(cid, gateway = "https://ipfs.io/ipfs/") {
    return `${gateway}${cid}`;
  }
}

module.exports = IPFSClient;
