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

### Tech Stack

We decided to use:
- **Ethereum Sepolia testnet** - for the blockchain part
- **Solidity** - for writing smart contracts
- **Hardhat** - for development and testing
- **Ethers.js** - for interacting with the blockchain
- **IPFS** - for storing credential data off-chain
- **React/Next.js** - for the frontend (still in progress)

## Getting Started

### Prerequisites

You'll need:
- Node.js (we used v18, but should work with v16+)
- npm or yarn
- Git
- MetaMask or some wallet that works with Ethereum
- An account on Sepolia testnet with some test ETH (you can get free test ETH from faucets)

### Installation

First, clone the repo:

```bash
git clone <repository-url>
cd decentralized-iam-onboarding
```

Then install the dependencies:

```bash
npm install
```

We're using Hardhat for development, so make sure that installs correctly.

### Setting Up Environment Variables

You'll need to create a `.env` file. We have a template but here's what you need:

```env
# Ethereum Network - you'll need an Infura or Alchemy account
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here

# IPFS - we're planning to use Infura IPFS
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_PROJECT_ID=your_ipfs_project_id
IPFS_PROJECT_SECRET=your_ipfs_secret

# Contract Addresses - these get filled in after you deploy
DID_REGISTRY_ADDRESS=
CREDENTIAL_STATUS_REGISTRY_ADDRESS=
AUDIT_LOG_ADDRESS=
```

**Important**: Never commit your `.env` file! It should be in `.gitignore` (and it is).

### Compiling the Contracts

To compile the Solidity contracts:

```bash
npx hardhat compile
```

This should create the artifacts in the `artifacts/` folder. If you get errors, make sure you have the right Solidity version (we're using 0.8.20).

### Running Tests

We have some basic tests:

```bash
npx hardhat test
```

The tests are still pretty basic - we're planning to add more comprehensive test coverage as we continue development.

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

### Production

We haven't deployed to mainnet yet. That's still a work in progress. We need to do more security audits and testing first.

## Project Structure

Here's how we organized the code:

```
decentralized-iam-onboarding/
├── contracts/           # Our Solidity smart contracts
│   ├── DIDRegistry.sol
│   ├── CredentialStatusRegistry.sol
│   ├── AuditLog.sol
│   └── IAuditLog.sol
├── scripts/             # Deployment scripts
│   └── deploy.js
├── test/                # Test files
│   └── DIDRegistry.test.js
├── frontend/            # React app (not started yet)
├── src/                 # Off-chain utilities (not started yet)
└── hardhat.config.js   # Hardhat configuration
```

## Smart Contracts Overview

### DIDRegistry.sol

This contract manages DIDs. You can register a new DID, rotate keys, and deactivate DIDs. We store the public keys on-chain but no personal information.

### CredentialStatusRegistry.sol

This handles revocation using a StatusList approach. The actual status list is stored off-chain (probably on IPFS), and we only store the Merkle root on-chain for privacy. This way verifiers can check if something is revoked without needing the full list.

### AuditLog.sol

This logs everything - when credentials are issued, revoked, verified, etc. It's important for compliance and auditing. We index events by credential ID, DID, and actor address so you can query them easily.

## Testing

Run tests with:

```bash
npx hardhat test
```

For coverage (we haven't set this up yet, but plan to):

```bash
npx hardhat coverage
```

## Current Status / Known Issues

This is still a work in progress. Here's what we have and what's missing:

✅ **Working:**
- Basic smart contracts compiled and deployed
- Basic tests for DID Registry
- Deployment scripts

❌ **Still TODO:**
- Full frontend implementation
- Off-chain credential issuance (JWT-VC)
- IPFS integration
- More comprehensive tests
- Merkle proof verification (currently just a placeholder)
- Frontend wallet integration
- Integration with actual verifiers

## Challenges We Faced

Some things that were tricky:
- Understanding how StatusList2021 works for revocation
- Figuring out the best way to store data off-chain vs on-chain
- Gas optimization (storage is expensive!)
- Learning Solidity best practices

## Contributing

This is a team project. We're using GitHub with branches:
1. Create a feature branch
2. Make your changes
3. Submit a PR
4. Get someone to review it

## License

Apache License 2.0

## References

We used these resources:
- [W3C DIDs v1.0](https://www.w3.org/TR/did-core/) - The standard for DIDs
- [EBSI Self-Sovereign Identity Framework](https://ec.europa.eu/digital-building-blocks/wikis/display/EBSIDOC) - EU's SSI framework
- Verifiable Credentials for Access Control in Decentralized Systems (IEEE Blockchain 2023) - Academic paper we referenced

## Team

Our team consists of:
- Project Manager
- Smart Contract Developer (that's me!)
- Frontend Developer
- Backend/Off-Chain Engineer
- QA & Documentation Lead

## Questions?

If you have questions or find bugs, please open an issue on GitHub. We're still learning, so any feedback is helpful!
