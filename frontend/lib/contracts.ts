import { ethers } from "ethers";

export const CONTRACT_ADDRESSES = {
    DIDRegistry: process.env.NEXT_PUBLIC_DID_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    CredentialStatusRegistry: process.env.NEXT_PUBLIC_CREDENTIAL_STATUS_REGISTRY_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    AuditLog: process.env.NEXT_PUBLIC_AUDIT_LOG_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
};

const DIDRegistryABI = [
   "function deactivateDID(string memory did) public",
    
];

const CredentialStatusRegistryABI = [
    "function isRevoked(string memory credentialId) public view returns (bool)",
];

const AuditLogABI = [
    "function logEvent(uint8 eventType, string memory actorDID, address actorAddress, string memory targetDID, string memory resourceId, string memory details) public",
];

export function getDIDRegistry(provider: ethers.Provider | ethers.Signer) {
    return new ethers.Contract(CONTRACT_ADDRESSES.DIDRegistry, DIDRegistryABI, provider);
}

export function getCredentialStatusRegistry(provider: ethers.Provider | ethers.Signer) {
    return new ethers.Contract(CONTRACT_ADDRESSES.CredentialStatusRegistry, CredentialStatusRegistryABI, provider);
}

export function getAuditLog(provider: ethers.Provider | ethers.Signer) {
    return new ethers.Contract(CONTRACT_ADDRESSES.AuditLog, AuditLogABI, provider);
}
