# Decentralized IAM Onboarding System

## Project Overview

This is our team's project for building a decentralized Identity and Access Management (IAM) system. The main goal is to solve the problem of slow employee onboarding where new hires have to wait days or weeks to get access to systems like building entry, VPN, code repos, etc. 

We're using blockchain technology with Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs) to make this instant. The idea is that when someone gets hired, they immediately get a credential that can be verified cryptographically without needing to contact a central server every time.

### What We're Trying to Build

The system has three main smart contracts:
1. **DID Registry** - This stores people's decentralized identifiers and their public keys
2. **Credential Status Registry** - This handles revocation (when someone leaves or their access needs to be revoked)
3. **Audit Log** - This keeps track of everything that happens for compliance

### Key Features

- **Instant Access**: New employees get access on day one via Access-Grant VCs
- **Privacy**: We don't store any personal info on the blockchain, just commitments and hashes
- **Fast Revocation**: When someone leaves, we can instantly revoke their access globally
- **No Central Server**: Verifiers can check credentials without calling back to the issuer

### Dependecies/ Tech Stack


- **Ethereum Sepolia testnet** - for the blockchain part
- **Solidity** - for writing smart contracts
- **Hardhat** - for development and testing
- **Ethers.js** - for interacting with the blockchain
- **IPFS** - for storing credential data off-chain
- **React/Next.js** - for the frontend (still in progress)

 


### Deploying to Sepolia

To deploy to the Sepolia testnet:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Make sure you have:
1. Sepolia ETH in your deployment account (get it from a faucet)
2. Your `.env` file configured correctly
3. The RPC URL is working

After deployment, the script will print out the contract addresses. Save those to your `.env` file.

## How It Works (Basic Usage)

### For Issuers (HR/IT People)

This is still a work in progress, but here's the plan:

1. Deploy the contracts to Sepolia (or use our deployed ones)
2. Register your organization's DID in the DID Registry
3. When hiring someone:
   - Create a verifiable credential with their access groups
   - Sign it with your issuer key
   - Store the credential metadata on IPFS
   - Update the status list on-chain
   - Log the issuance in the audit log

### For Employees (Holders)

1. Create your own DID and key pair
2. Receive the Access-Grant VC from your employer
3. When you need to access something:
   - Create a presentation (you can choose what to reveal)
   - Show it to the verifier (door, VPN, etc.)
4. The verifier checks it without needing to call your employer

### For Verifiers (Door Controllers, VPN Gateways, etc.)

1. Receive the verifiable presentation from the employee
2. Verify the cryptographic signature
3. Check if it's revoked on-chain (this is fast)
4. Check if it's expired
5. Grant or deny access

## Deployment

### Local Testing

For local development:

```bash
# Start a local Hardhat node
npx hardhat node

# In another terminal, deploy to local
npx hardhat run scripts/deploy.js --network localhost
```

This is useful for testing without spending gas.

### Sepolia Testnet

1. Get Sepolia ETH from a faucet
2. Make sure your `.env` has the Sepolia RPC URL
3. Run the deploy script:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## Smart Contracts Overview

### DIDRegistry.sol

This contract manages DIDs. You can register a new DID, rotate keys, and deactivate DIDs. We store the public keys on-chain but no personal information.

### CredentialStatusRegistry.sol

This handles revocation using a StatusList approach. The actual status list is stored off-chain (probably on IPFS), and we only store the Merkle root on-chain for privacy. This way verifiers can check if something is revoked without needing the full list.

### AuditLog.sol

This logs everything - when credentials are issued, revoked, verified, etc. It's important for compliance and auditing. We index events by credential ID, DID, and actor address so you can query them easily.




## Contributing

This is a team project. We're using GitHub with branches:
1. Create a feature branch
2. Make your changes
3. Submit a PR
4. Get someone to review it

## License

Apache License 2.0


## Team

Our team consists of:
- Project Manager
- Smart Contract Developer (that's me!)
- Frontend Developer
- Backend/Off-Chain Engineer
- QA & Documentation Lead

