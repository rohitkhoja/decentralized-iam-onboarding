const { ethers } = require("ethers");

class KeyManager {
  constructor() {
    this.keys = new Map();
  }

  generateKeyPair() {
    const wallet = ethers.Wallet.createRandom();
    return {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address
    };
  }

  generateKeyPairFromMnemonic(mnemonic, index = 0) {
    const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    const wallet = hdNode.deriveChild(index);
    return {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address
    };
  }

  storeKey(keyId, keyPair) {
    this.keys.set(keyId, keyPair);
  }

  getKey(keyId) {
    return this.keys.get(keyId);
  }

  signMessage(message, privateKey) {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.signMessage(message);
  }

  verifySignature(message, signature, publicKey) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      const publicKeyAddress = ethers.computeAddress(publicKey);
      return recoveredAddress.toLowerCase() === publicKeyAddress.toLowerCase();
    } catch (error) {
      return false;
    }
  }
}

module.exports = KeyManager;

