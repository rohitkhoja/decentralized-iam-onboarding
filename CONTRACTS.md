# Smart Contracts Documentation

This document describes our smart contracts - what they do, how they work, and how to use them. This is part of our project documentation.

## Overview

We have three main contracts that work together to create the decentralized IAM system:
1. DIDRegistry - manages decentralized identifiers
2. CredentialStatusRegistry - handles credential revocation
3. AuditLog - logs everything for compliance



## Contract Details

### 1. DIDRegistry.sol

**What it does:**
This contract stores and manages DIDs . When someone creates a DID, we store their public key and some metadata. The DID itself is just a string identifier.

**Key Functions:**

```solidity
function registerDID(
    string memory did,
    bytes memory publicKey,
    string memory keyType
) external;
```
This registers a new DID. Anyone can call it, but you need to provide a valid DID string and public key.

```solidity
function rotateKey(
    string memory did,
    bytes memory newPublicKey,
    string memory keyType
) external;
```
Allows you to rotate your public key. Only the controller (person who registered it) can do this.

```solidity
function deactivateDID(string memory did) external;
```
Deactivates a DID. Again, only the controller can do this.

```solidity
function getDIDDocument(string memory did) 
    external 
    view 
    returns (DIDDocument memory);
```
Returns the full DID document.

**How it works:**
- We store DID documents in a mapping
- Each DID has a controller (the Ethereum address that registered it)
- We keep a history of key rotations for audit purposes
- We also track which DIDs belong to which controller

**Events:**
- `DIDRegistered` - emitted when a new DID is registered
- `DIDKeyRotated` - emitted when a key is rotated
- `DIDDeactivated` - emitted when a DID is deactivated



---

### 2. CredentialStatusRegistry.sol

**What it does:**
This handles credential revocation. When someone leaves the company or their access needs to be revoked, we use this contract to mark credentials as revoked.

**Key Functions:**

```solidity
function createStatusList(
    string memory statusListId,
    string memory issuerDID,
    bytes32 rootHash,
    uint256 listSize,
    string memory statusListURI
) external;
```
Creates a new status list. The issuer creates this and stores the actual list off-chain (on IPFS). We only store the Merkle root hash on-chain.

```solidity
function updateStatusList(
    string memory statusListId,
    bytes32 newRootHash,
    uint256 revokedCount
) external;
```
Updates the status list when credentials are revoked. The issuer updates the off-chain list and then updates the root hash here.

```solidity
function revokeCredential(
    string memory credentialId,
    string memory statusListId,
    string memory reason
) external;
```
Marks a single credential as revoked. This is a quick lookup we added for convenience.

```solidity
function batchRevokeCredentials(
    string[] memory credentialIds,
    string memory statusListId,
    string memory reason
) external;
```
Revokes multiple credentials at once. This saves gas compared to calling revokeCredential multiple times.

```solidity
function isRevoked(string memory credentialId) external view returns (bool);
```
Quick check if a credential is revoked. This is simpler than checking the Merkle proof.

```solidity
function verifyCredentialStatus(
    string memory credentialId,
    string memory,
    bytes32[] memory,
    uint256
) external view returns (bool);
```
This is supposed to verify using a Merkle proof, but we haven't fully implemented it yet. Right now it just checks the quick lookup table. This is a TODO for later.

**How it works:**
- We use the StatusList2021 approach for privacy
- The full status list is stored off-chain (IPFS)
- Only the Merkle root is stored on-chain
- We also have a quick lookup mapping for common cases (trade-off between privacy and speed)

**Events:**
- `StatusListCreated` - when a new status list is created
- `StatusListUpdated` - when the root hash is updated
- `CredentialRevoked` - when a credential is revoked
- `CredentialUnrevoked` - if we ever unrevoke (not implemented yet)



---

### 3. AuditLog.sol

**What it does:**
This logs every important event in the system. It's like a permanent record of everything that happens - credential issuance, revocation, key rotations, etc.

**Key Functions:**

```solidity
function logEvent(
    EventType eventType,
    string memory actorDID,
    address actorAddress,
    string memory subjectDID,
    string memory credentialId,
    string memory details
) external returns (uint256);
```
Creates a new audit log entry. Only authorized contracts (DIDRegistry, CredentialStatusRegistry) can call this.

```solidity
function getAuditEntry(uint256 eventId) 
    external 
    view 
    returns (AuditEntry memory);
```
Gets a specific audit entry by ID.

```solidity
function getCredentialHistory(string memory credentialId) 
    external 
    view 
    returns (uint256[] memory);
```
Gets all events related to a specific credential.

```solidity
function getDIDHistory(string memory did) 
    external 
    view 
    returns (uint256[] memory);
```
Gets all events related to a specific DID.

```solidity
function queryEventsByTypeAndTimeRange(
    EventType eventType,
    uint256 startTime,
    uint256 endTime
) external view returns (uint256[] memory);
```
Queries events by type and time range. This is a bit inefficient (we iterate through all events) but it works for now.

**How it works:**
- We store audit entries in a mapping
- We index events by credential ID, DID, and actor address for fast lookup
- Each entry has a unique event ID
- We store the transaction hash for verification

**Event Types:**
We have 10 different event types:
- `CREDENTIAL_ISSUED` - when a credential is issued
- `CREDENTIAL_REVOKED` - when a credential is revoked
- `CREDENTIAL_VERIFIED` - when a credential is verified
- `ACCESS_GRANTED` - when access is granted
- `ACCESS_DENIED` - when access is denied
- `DID_REGISTERED` - when a DID is registered
- `DID_KEY_ROTATED` - when a key is rotated
- `DID_DEACTIVATED` - when a DID is deactivated
- `STATUS_LIST_CREATED` - when a status list is created
- `STATUS_LIST_UPDATED` - when a status list is updated

**Events:**
- `AuditEntryCreated` - when a new entry is created




---

### 4. IAuditLog.sol

**What it does:**
This is just an interface for the AuditLog contract. Other contracts can use this to interact with the audit log.


---

## How Contracts Work Together

### Deployment Order

You have to deploy them in this order:
1. **DIDRegistry** first - no dependencies
2. **CredentialStatusRegistry** second - no dependencies  
3. **AuditLog** last - needs addresses of the other two in the constructor

### Flow

**When issuing a credential:**
1. Issuer registers their DID in DIDRegistry
2. Issuer creates a status list in CredentialStatusRegistry
3. Issuer creates the credential off-chain (JWT-VC, not in our contracts)
4. Issuer stores credential metadata on IPFS
5. Issuer logs the issuance in AuditLog (if we implement this integration)

**When verifying a credential:**
1. Verifier receives the credential presentation
2. Verifier checks the signature (off-chain)
3. Verifier calls `isRevoked()` or `verifyCredentialStatus()` on CredentialStatusRegistry
4. Verifier logs the verification in AuditLog (if we implement this)

**When revoking:**
1. Issuer calls `revokeCredential()` or `batchRevokeCredentials()`
2. Issuer updates the status list (off-chain) and updates the root hash
3. Event is logged in AuditLog







