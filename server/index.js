require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const DIDService = require("./services/didService");
const CredentialService = require("./services/credentialService");
const VerificationService = require("./services/verificationService");
const EmployeeService = require("./services/employeeService");
const accessRequestService = require("./services/accessRequestService");
const { companyStructure, getAllTeams, validateTeamAndRole } = require("./config/companyStructure");
const seedDefaultEmployees = require("./utils/seedData");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545");

const CONTRACT_ADDRESSES = {
  didRegistry: process.env.DID_REGISTRY_ADDRESS || "",
  credentialStatusRegistry: process.env.CREDENTIAL_STATUS_REGISTRY_ADDRESS || "",
  auditLog: process.env.AUDIT_LOG_ADDRESS || "",
};

function validateContractAddresses() {
  const missing = [];
  if (!CONTRACT_ADDRESSES.didRegistry || CONTRACT_ADDRESSES.didRegistry === "") {
    missing.push("DID_REGISTRY_ADDRESS");
  }
  if (!CONTRACT_ADDRESSES.credentialStatusRegistry || CONTRACT_ADDRESSES.credentialStatusRegistry === "") {
    missing.push("CREDENTIAL_STATUS_REGISTRY_ADDRESS");
  }
  if (!CONTRACT_ADDRESSES.auditLog || CONTRACT_ADDRESSES.auditLog === "") {
    missing.push("AUDIT_LOG_ADDRESS");
  }

  if (missing.length > 0) {
    throw new Error(`Missing contract addresses in .env file: ${missing.join(", ")}`);
  }
}

let didService = null;
let credentialService = null;
let verificationService = null;
let employeeService = null;
let issuerWallet = null;
let issuerDID = null;
let defaultStatusListId = null;

async function initializeServices() {
  try {
    validateContractAddresses();
    didService = new DIDService(provider, CONTRACT_ADDRESSES);
    credentialService = new CredentialService(provider, CONTRACT_ADDRESSES);
    verificationService = new VerificationService(provider, CONTRACT_ADDRESSES);
    employeeService = new EmployeeService(provider, CONTRACT_ADDRESSES, credentialService);

    await autoRegisterIssuerDID();
    await autoCreateDefaultStatusList();

    if (issuerDID && process.env.ISSUER_PRIVATE_KEY) {
      await seedDefaultEmployees(employeeService, issuerDID, process.env.ISSUER_PRIVATE_KEY, defaultStatusListId);
    } else if (issuerDID) {
      const hardcodedKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      await seedDefaultEmployees(employeeService, issuerDID, hardcodedKey, defaultStatusListId);
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function autoRegisterIssuerDID() {
  try {
    const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    issuerWallet = new ethers.Wallet(issuerPrivateKey, provider);
    const issuerAddress = issuerWallet.address;
    issuerDID = `did:ethr:${issuerAddress}`;

    const isActive = await didService.isDIDActive(issuerDID).catch(() => false);

    if (!isActive) {
      const publicKeyBytes = ethers.toUtf8Bytes(issuerAddress);
      await didService.registerDID(issuerWallet, issuerDID, publicKeyBytes, "EcdsaSecp256k1VerificationKey2019");
    }
  } catch (error) {
  }
}

async function autoCreateDefaultStatusList() {
  try {
    if (!issuerDID || !issuerWallet) {
      return;
    }

    defaultStatusListId = "default-company-status-list";

    try {
      const result = await credentialService.createStatusList(issuerWallet, issuerDID, defaultStatusListId);
      defaultStatusListId = result.statusListId;
    } catch (error) {
      if (!error.message.includes("already exists")) {
        defaultStatusListId = null;
      }
    }
  } catch (error) {
    defaultStatusListId = null;
  }
}

function authenticateUser(req, res, next) {
  const { userId, privateKey } = req.body;

  if (!userId || !privateKey) {
    return res.status(400).json({ error: "userId and privateKey are required" });
  }

  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const address = wallet.address;

    req.user = {
      userId,
      privateKey,
      address,
      wallet,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid private key" });
  }
}

app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId, privateKey } = req.body;

    if (!userId || !privateKey) {
      return res.status(400).json({ error: "userId and privateKey are required" });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const address = wallet.address;
    const balance = await provider.getBalance(address);

    const role = determineRole(userId);

    res.json({
      success: true,
      user: {
        userId,
        address,
        balance: ethers.formatEther(balance),
        role,
      },
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid credentials: " + error.message });
  }
});

function determineRole(userId) {
  if (userId.toLowerCase().includes("issuer") || userId.toLowerCase().includes("hr") || userId.toLowerCase().includes("admin")) {
    return "issuer";
  } else if (userId.toLowerCase().includes("holder") || userId.toLowerCase().includes("employee")) {
    return "holder";
  } else if (userId.toLowerCase().includes("verifier")) {
    return "verifier";
  }
  return "holder";
}

app.post("/api/did/register", authenticateUser, async (req, res) => {
  try {
    if (!didService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { did, publicKey, keyType } = req.body;
    const { wallet } = req.user;

    const result = await didService.registerDID(wallet, did, publicKey, keyType);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/did/:did", async (req, res) => {
  try {
    if (!didService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { did } = req.params;
    const result = await didService.getDIDDocument(did);

    res.json({
      success: true,
      didDocument: result,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post("/api/did/check", async (req, res) => {
  try {
    if (!didService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { did } = req.body;
    const isActive = await didService.isDIDActive(did);

    res.json({
      success: true,
      isActive,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/credential/status-list/create", authenticateUser, async (req, res) => {
  try {
    if (!credentialService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { issuerDID } = req.body;
    const { wallet } = req.user;

    const result = await credentialService.createStatusList(wallet, issuerDID);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/credential/issue", authenticateUser, async (req, res) => {
  try {
    if (!credentialService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { issuerDID, holderDID, accessGroups, expirationDays, statusListId } = req.body;
    const { wallet, privateKey } = req.user;

    if (!issuerDID || !holderDID || !accessGroups) {
      return res.status(400).json({ error: "issuerDID, holderDID, and accessGroups are required" });
    }

    const result = await credentialService.issueCredential(
      wallet,
      issuerDID,
      privateKey,
      holderDID,
      accessGroups,
      expirationDays || 365,
      statusListId
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/credential/revoke", authenticateUser, async (req, res) => {
  try {
    if (!credentialService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { credentialId, statusListId } = req.body;
    const { wallet } = req.user;

    const result = await credentialService.revokeCredential(wallet, credentialId, statusListId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/verification/credential", async (req, res) => {
  try {
    if (!verificationService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { jwt, statusListId } = req.body;

    const result = await verificationService.verifyCredential(jwt, statusListId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/verification/presentation", async (req, res) => {
  try {
    if (!verificationService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const { jwt } = req.body;

    const result = await verificationService.verifyPresentation(jwt);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/verification/check-resource-access", async (req, res) => {
  try {
    const { privateKey, resourceId } = req.body;

    if (!privateKey || !resourceId) {
      return res.status(400).json({ error: "privateKey and resourceId are required" });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const address = wallet.address;
    const employeeDID = `did:ethr:${address}`;

    const employee = employeeService.getEmployeeByDID(employeeDID);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const access = await employeeService.getEmployeeAccess(employee.email, privateKey);
    const groups = access.accessGroups || [];

    let accessLevel = "no-access";

    if (groups.includes(resourceId)) {
      accessLevel = "access";
    }

    if (groups.includes(`${resourceId}-admin`)) accessLevel = "admin";
    else if (groups.includes(`${resourceId}-write`)) accessLevel = "write";
    else if (groups.includes(`${resourceId}-read`)) accessLevel = "read";

    if (verificationService) {
      const success = accessLevel !== "no-access";
      verificationService.logAccessAttempt(employeeDID, address, resourceId, accessLevel, success);
    }

    res.json({
      success: true,
      resourceId,
      accessLevel
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/company/structure", (req, res) => {
  try {
    res.json({
      success: true,
      structure: companyStructure,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/company/teams", (req, res) => {
  try {
    const teams = getAllTeams();
    res.json({
      success: true,
      teams,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/company/access-types", (req, res) => {
  try {
    res.json({
      success: true,
      accessTypes: companyStructure.allAccessTypes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/employee/create", authenticateUser, async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { email, teamId, roleId, statusListId } = req.body;
    const { wallet, privateKey, address } = req.user;

    if (!email || !teamId || !roleId) {
      return res.status(400).json({ error: "email, teamId, and roleId are required" });
    }

    const validation = validateTeamAndRole(teamId, roleId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const issuerDID = `did:ethr:${address}`;
    const statusListIdToUse = defaultStatusListId || null;

    const result = await employeeService.createEmployee(
      email,
      teamId,
      roleId,
      issuerDID,
      privateKey,
      statusListIdToUse
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/employee/access-by-did", authenticateUser, async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { address, privateKey } = req.user;
    const employeeDID = `did:ethr:${address}`;

    const employee = employeeService.getEmployeeByDID(employeeDID);

    if (!employee || !employee.email) {
      let didExistsOnChain = false;
      let didDocument = null;
      try {
        if (didService) {
          didDocument = await didService.getDIDDocument(employeeDID);
          didExistsOnChain = didDocument && didDocument.isActive && didDocument.controller === address;
        }
      } catch (err) {
      }

      const allEmployees = await employeeService.getAllEmployees();

      if (didExistsOnChain) {
        return res.status(404).json({
          error: "Employee account record not found in server memory.",
          did: employeeDID,
          didExistsOnChain: true,
          address: address
        });
      }

      return res.status(404).json({
        error: "Employee account not found.",
        did: employeeDID,
        didExistsOnChain: false,
        debug: {
          totalEmployees: allEmployees.length,
          employeeDIDs: allEmployees.map(e => e.did)
        }
      });
    }

    const access = await employeeService.getEmployeeAccess(employee.email, privateKey);

    res.json({
      success: true,
      ...access,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/employee/:email/access", authenticateUser, async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { email } = req.params;
    const { privateKey } = req.user;

    const access = await employeeService.getEmployeeAccess(email, privateKey);

    res.json({
      success: true,
      ...access,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/employee/:email/add-access", authenticateUser, async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { email } = req.params;
    const { accessGroups, statusListId } = req.body;
    const { wallet, privateKey, address } = req.user;

    if (!accessGroups || !Array.isArray(accessGroups) || accessGroups.length === 0) {
      return res.status(400).json({ error: "accessGroups array is required" });
    }

    const issuerDID = `did:ethr:${address}`;
    const statusListIdToUse = defaultStatusListId || null;

    const result = await employeeService.addAccessToEmployee(
      email,
      accessGroups,
      issuerDID,
      privateKey,
      statusListIdToUse
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/employee/:email/revoke", authenticateUser, async (req, res) => {
  try {
    if (!credentialService || !employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { email } = req.params;
    const { statusListId } = req.body;
    const { wallet } = req.user;

    const credentials = await employeeService.getEmployeeCredentialsAdmin(email);

    const results = [];
    for (const cred of credentials) {
      if (cred.credentialId) {
        try {
          const result = await credentialService.revokeCredential(
            wallet,
            cred.credentialId,
            statusListId || cred.statusListId || defaultStatusListId
          );
          results.push({ credentialId: cred.credentialId, success: true, txHash: result.txHash });
        } catch (err) {
          results.push({ credentialId: cred.credentialId, success: false, error: err.message });
        }
      }
    }

    res.json({
      success: true,
      message: `Revoked ${results.filter(r => r.success).length} credentials for ${email}`,
      results
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/employee/team/:teamId", async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { teamId } = req.params;
    const employees = await employeeService.getEmployeesByTeam(teamId);

    res.json({
      success: true,
      employees: employees.map(emp => ({
        email: emp.email,
        did: emp.did,
        teamId: emp.teamId,
        roleId: emp.roleId,
        accessGroups: emp.accessGroups
      })),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/employees", async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const employees = await employeeService.getAllEmployees();

    res.json({
      success: true,
      employees: employees.map(emp => ({
        email: emp.email,
        did: emp.did,
        teamId: emp.teamId,
        roleId: emp.roleId,
        accessGroups: emp.accessGroups,
        createdAt: emp.createdAt
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/access-request/create", authenticateUser, async (req, res) => {
  try {
    const { requestedAccess, reason } = req.body;
    const { privateKey, address } = req.user;

    if (!requestedAccess || !Array.isArray(requestedAccess) || requestedAccess.length === 0) {
      return res.status(400).json({ error: "requestedAccess array is required" });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const employeeDID = `did:ethr:${address}`;

    const employee = employeeService.getEmployeeByDID(employeeDID);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const request = accessRequestService.createAccessRequest(
      employee.email,
      employeeDID,
      requestedAccess,
      reason
    );

    res.json({
      success: true,
      request,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/access-request/pending", authenticateUser, async (req, res) => {
  try {
    const requests = accessRequestService.getPendingRequests();

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/access-request/my-requests", authenticateUser, async (req, res) => {
  try {
    const { privateKey, address } = req.user;
    const employeeDID = `did:ethr:${address}`;

    const employee = employeeService.getEmployeeByDID(employeeDID);
    if (!employee) {
      return res.json({
        success: true,
        requests: [],
      });
    }

    const requests = accessRequestService.getRequestsByEmployee(employee.email);

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/access-request/:requestId/approve", authenticateUser, async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { requestId } = req.params;
    const { statusListId, reviewNotes } = req.body;
    const { wallet, privateKey, address } = req.user;

    const request = accessRequestService.getRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const reviewerEmail = req.body.userId || `reviewer-${address}`;
    accessRequestService.approveRequest(requestId, reviewerEmail, reviewNotes);

    const issuerDID = `did:ethr:${address}`;
    const statusListIdToUse = statusListId || defaultStatusListId || null;

    await employeeService.addAccessToEmployee(
      request.employeeEmail,
      request.requestedAccess,
      issuerDID,
      privateKey,
      statusListIdToUse
    );

    const updatedRequest = accessRequestService.getRequest(requestId);

    res.json({
      success: true,
      request: updatedRequest,
      message: "Access granted and request approved",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/audit-logs", async (req, res) => {
  try {
    if (!verificationService) {
      return res.status(500).json({ error: "Services not initialized" });
    }

    const { did } = req.query;
    const auditLogContract = verificationService.auditLog;
    if (!auditLogContract) {
      return res.json({ success: true, logs: [] });
    }

    const totalEvents = await auditLogContract.getTotalEvents();
    const count = Number(totalEvents);

    const logs = [];
    const start = Math.max(1, count - 49);

    for (let i = count; i >= start; i--) {
      try {
        const entry = await auditLogContract.getAuditEntry(i);
        const entryDID = entry.actorDID;

        if (did && entryDID.toLowerCase() !== did.toLowerCase()) {
          continue;
        }

        logs.push({
          eventId: Number(entry.eventId),
          eventType: Number(entry.eventType),
          timestamp: Number(entry.timestamp),
          actorDID: entry.actorDID,
          details: entry.details,
          txHash: entry.txHash
        });

        if (logs.length >= 10) break;

      } catch (err) {
      }
    }

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/access-request/:requestId/deny", authenticateUser, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewNotes } = req.body;
    const { address } = req.user;

    const request = accessRequestService.getRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const reviewerEmail = req.body.userId || `reviewer-${address}`;
    accessRequestService.denyRequest(requestId, reviewerEmail, reviewNotes);

    const updatedRequest = accessRequestService.getRequest(requestId);

    res.json({
      success: true,
      request: updatedRequest,
      message: "Request denied",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    contracts: CONTRACT_ADDRESSES,
  });
});

app.get("/api/debug/employees", async (req, res) => {
  try {
    if (!employeeService) {
      return res.status(500).json({ error: "Services not initialized" });
    }
    const allEmployees = await employeeService.getAllEmployees();
    res.json({
      success: true,
      count: allEmployees.length,
      employees: allEmployees.map(emp => ({
        email: emp.email,
        did: emp.did,
        address: emp.address,
        teamId: emp.teamId,
        roleId: emp.roleId,
        accessGroups: emp.accessGroups
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  await initializeServices();
});
