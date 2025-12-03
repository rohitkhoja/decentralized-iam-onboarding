const employees = new Map();
const emailToPrivateKey = new Map();
const emailToCredentials = new Map();

function createEmployee(email, employeeData) {
  employees.set(email, {
    ...employeeData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function getEmployee(email) {
  return employees.get(email) || null;
}

function getAllEmployees() {
  const allEmployees = Array.from(employees.values());

  return allEmployees.map(emp => {
    const creds = emailToCredentials.get(emp.email) || [];
    const allAccessGroups = new Set(emp.accessGroups || []);

    creds.forEach(cred => {
      if (cred.accessGroups && Array.isArray(cred.accessGroups)) {
        cred.accessGroups.forEach(ag => allAccessGroups.add(ag));
      }
    });

    return {
      ...emp,
      accessGroups: Array.from(allAccessGroups)
    };
  });
}

function getEmployeesByTeam(teamId) {
  const teamEmployees = Array.from(employees.values()).filter(emp => emp.teamId === teamId);

  return teamEmployees.map(emp => {
    const creds = emailToCredentials.get(emp.email) || [];
    const allAccessGroups = new Set(emp.accessGroups || []);

    creds.forEach(cred => {
      if (cred.accessGroups && Array.isArray(cred.accessGroups)) {
        cred.accessGroups.forEach(ag => allAccessGroups.add(ag));
      }
    });

    return {
      ...emp,
      accessGroups: Array.from(allAccessGroups)
    };
  });
}

function updateEmployee(email, updates) {
  const employee = employees.get(email);
  if (!employee) {
    return false;
  }
  employees.set(email, {
    ...employee,
    ...updates,
    updatedAt: new Date().toISOString()
  });
  return true;
}

function storePrivateKey(email, privateKey) {
  emailToPrivateKey.set(email, privateKey);
}

function getPrivateKey(email) {
  return emailToPrivateKey.get(email) || null;
}

function addCredential(email, credential) {
  if (!emailToCredentials.has(email)) {
    emailToCredentials.set(email, []);
  }
  emailToCredentials.get(email).push({
    ...credential,
    issuedAt: new Date().toISOString()
  });
}

function getCredentials(email) {
  return emailToCredentials.get(email) || [];
}

function getAllCredentials() {
  const all = [];
  emailToCredentials.forEach((creds, email) => {
    all.push({ email, credentials: creds });
  });
  return all;
}

function findCredentialsByDID(did) {
  const all = [];
  employees.forEach((emp, email) => {
    if (emp.did === did) {
      const creds = emailToCredentials.get(email) || [];
      all.push(...creds);
    }
  });
  return all;
}

function findEmployeeByDID(did) {
  const normalizedDID = did ? did.toLowerCase().trim() : "";
  for (const [email, emp] of employees.entries()) {
    const empDID = emp.did ? emp.did.toLowerCase().trim() : "";
    if (empDID === normalizedDID) {
      return { email, ...emp };
    }
  }
  return null;
}

function findEmailByDID(did) {
  for (const [email, emp] of employees.entries()) {
    if (emp.did === did) {
      return email;
    }
  }
  return null;
}

function clearAll() {
  employees.clear();
  emailToPrivateKey.clear();
  emailToCredentials.clear();
}

module.exports = {
  createEmployee,
  getEmployee,
  getAllEmployees,
  getEmployeesByTeam,
  updateEmployee,
  storePrivateKey,
  getPrivateKey,
  addCredential,
  getCredentials,
  getAllCredentials,
  findCredentialsByDID,
  findEmployeeByDID,
  findEmailByDID,
  clearAll
};

