const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  console.log("\nDeploying DIDRegistry...");
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.waitForDeployment();
  const didRegistryAddress = await didRegistry.getAddress();
  console.log("DIDRegistry deployed to:", didRegistryAddress);

  console.log("\nDeploying CredentialStatusRegistry...");
  const CredentialStatusRegistry = await hre.ethers.getContractFactory("CredentialStatusRegistry");
  const credentialStatusRegistry = await CredentialStatusRegistry.deploy();
  await credentialStatusRegistry.waitForDeployment();
  const credentialStatusRegistryAddress = await credentialStatusRegistry.getAddress();
  console.log("CredentialStatusRegistry deployed to:", credentialStatusRegistryAddress);

  console.log("\nDeploying AuditLog...");
  const AuditLog = await hre.ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy(didRegistryAddress, credentialStatusRegistryAddress);
  await auditLog.waitForDeployment();
  const auditLogAddress = await auditLog.getAddress();
  console.log("AuditLog deployed to:", auditLogAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("DIDRegistry:", didRegistryAddress);
  console.log("CredentialStatusRegistry:", credentialStatusRegistryAddress);
  console.log("AuditLog:", auditLogAddress);
  console.log("\nSave these addresses to your .env file:");
  console.log(`DID_REGISTRY_ADDRESS=${didRegistryAddress}`);
  console.log(`CREDENTIAL_STATUS_REGISTRY_ADDRESS=${credentialStatusRegistryAddress}`);
  console.log(`AUDIT_LOG_ADDRESS=${auditLogAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
