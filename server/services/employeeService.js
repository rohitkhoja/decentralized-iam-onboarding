const { ethers } = require("ethers");
const employeeStorage = require("../storage/employeeStorage");
const { getDefaultAccessForEmployee, combineAccessGroups, validateAccessGroups } = require("../utils/accessMapper");
const { validateTeamAndRole } = require("../config/companyStructure");
const DIDService = require("./didService");
const CredentialService = require("./credentialService");

class EmployeeService {
  constructor(provider, contractAddresses, credentialService) {
    this.provider = provider;
    this.contractAddresses = contractAddresses;
    this.credentialService = credentialService;
    this.didService = new DIDService(provider, contractAddresses);
  }

  async createEmployee(email, teamId, roleId, issuerDID, issuerPrivateKey, statusListId) {
    if (!email || !email.includes("@")) {
      throw new Error("Valid email address is required");
    }

    const existingEmployee = employeeStorage.getEmployee(email);
    if (existingEmployee) {
      throw new Error(`Employee with email ${email} already exists`);
    }

    const validation = validateTeamAndRole(teamId, roleId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const issuerWallet = new ethers.Wallet(issuerPrivateKey, this.provider);

    const employeeWallet = ethers.Wallet.createRandom();
    const privateKey = employeeWallet.privateKey;
    const employeeAddress = employeeWallet.address;
    const employeeDID = `did:ethr:${employeeAddress}`;

    const publicKeyBytes = ethers.toUtf8Bytes(employeeAddress);

    await this.didService.registerDID(
      issuerWallet,
      employeeDID,
      publicKeyBytes,
      "EcdsaSecp256k1VerificationKey2019"
    );

    const defaultAccess = getDefaultAccessForEmployee(teamId, roleId);

    if (defaultAccess.length === 0) {
      throw new Error(`No default access configured for team ${teamId} role ${roleId}`);
    }

    const credentialResult = await this.credentialService.issueCredential(
      issuerWallet,
      issuerDID,
      issuerPrivateKey,
      employeeDID,
      defaultAccess,
      365,
      statusListId
    );

    employeeStorage.createEmployee(email, {
      email,
      did: employeeDID,
      address: employeeAddress,
      teamId,
      roleId,
      accessGroups: defaultAccess,
      statusListId,
      credentialId: credentialResult.id
    });

    employeeStorage.storePrivateKey(email, privateKey);
    employeeStorage.addCredential(email, {
      credentialId: credentialResult.id,
      jwt: credentialResult.jwt,
      accessGroups: defaultAccess,
      issuedBy: issuerDID,
      statusListId,
      type: "team-access"
    });

    return {
      email,
      privateKey,
      did: employeeDID,
      address: employeeAddress,
      teamId,
      roleId,
      accessGroups: defaultAccess,
      credential: {
        id: credentialResult.id,
        jwt: credentialResult.jwt,
        cid: credentialResult.cid,
        ipfsURI: credentialResult.ipfsURI
      }
    };
  }

  async getEmployeeAccess(employeeEmail, privateKey) {
    const employee = employeeStorage.getEmployee(employeeEmail);
    if (!employee) {
      throw new Error(`Employee with email ${employeeEmail} not found`);
    }

    const storedPrivateKey = employeeStorage.getPrivateKey(employeeEmail);
    if (!storedPrivateKey || storedPrivateKey !== privateKey) {
      throw new Error("Invalid private key for this employee");
    }

    const credentials = employeeStorage.getCredentials(employeeEmail);
    const allAccessGroups = new Set();

    credentials.forEach(cred => {
      if (cred.accessGroups && Array.isArray(cred.accessGroups)) {
        cred.accessGroups.forEach(ag => allAccessGroups.add(ag));
      }
    });

    return {
      email: employee.email,
      did: employee.did,
      teamId: employee.teamId,
      roleId: employee.roleId,
      accessGroups: Array.from(allAccessGroups),
      credentials: credentials
    };
  }

  async getEmployeeCredentialsAdmin(employeeEmail) {
    const employee = employeeStorage.getEmployee(employeeEmail);
    if (!employee) {
      throw new Error(`Employee with email ${employeeEmail} not found`);
    }
    return employeeStorage.getCredentials(employeeEmail);
  }

  async addAccessToEmployee(employeeEmail, accessGroups, issuerDID, issuerPrivateKey, statusListId) {
    const employee = employeeStorage.getEmployee(employeeEmail);
    if (!employee) {
      throw new Error(`Employee with email ${employeeEmail} not found`);
    }

    const validation = validateAccessGroups(accessGroups);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const existingAccess = await this.getEmployeeAccess(employeeEmail, employeeStorage.getPrivateKey(employeeEmail));
    const combinedAccess = combineAccessGroups(existingAccess.accessGroups, accessGroups);

    const issuerWallet = new ethers.Wallet(issuerPrivateKey, this.provider);

    const credentialResult = await this.credentialService.issueCredential(
      issuerWallet,
      issuerDID,
      issuerPrivateKey,
      employee.did,
      accessGroups,
      365,
      statusListId
    );

    employeeStorage.addCredential(employeeEmail, {
      credentialId: credentialResult.id,
      jwt: credentialResult.jwt,
      accessGroups: accessGroups,
      issuedBy: issuerDID,
      statusListId,
      type: "additional-access"
    });

    return {
      email: employeeEmail,
      newAccessGroups: accessGroups,
      credential: {
        id: credentialResult.id,
        jwt: credentialResult.jwt
      },
      allAccessGroups: combinedAccess
    };
  }

  async getEmployeesByTeam(teamId) {
    return employeeStorage.getEmployeesByTeam(teamId);
  }

  async getAllEmployees() {
    return employeeStorage.getAllEmployees();
  }

  getEmployeeByEmail(email) {
    return employeeStorage.getEmployee(email);
  }

  getEmployeeByDID(did) {
    const normalizedDID = did ? did.toLowerCase().trim() : "";
    const allEmployees = employeeStorage.getAllEmployees();
    const employee = allEmployees.find(emp => {
      const empDID = emp.did ? emp.did.toLowerCase().trim() : "";
      return empDID === normalizedDID;
    }) || null;
    if (employee) {
      return { email: employee.email, ...employee };
    }
    return null;
  }

  validateEmployeeCredentials(email, privateKey) {
    const employee = employeeStorage.getEmployee(email);
    if (!employee) {
      return { valid: false, error: "Employee not found" };
    }

    const storedPrivateKey = employeeStorage.getPrivateKey(email);
    if (!storedPrivateKey || storedPrivateKey !== privateKey) {
      return { valid: false, error: "Invalid private key" };
    }

    return { valid: true, employee };
  }
}

module.exports = EmployeeService;

