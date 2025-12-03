const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface User {
  userId: string;
  address: string;
  balance: string;
  role: "issuer" | "holder" | "verifier";
}

export interface LoginResponse {
  success: boolean;
  user: User;
}

export interface DIDRegistrationResult {
  success: boolean;
  did: string;
  publicKey: string;
  keyType: string;
  txHash: string;
}

export interface StatusListResult {
  success: boolean;
  statusListId: string;
  rootHash: string;
  cid: string;
  statusListURI: string;
  txHash: string;
}

export interface CredentialIssueResult {
  success: boolean;
  credential: any;
  jwt: string;
  id: string;
  ipfsURI: string;
  cid: string;
}

function getAuthHeaders() {
  const privateKey = localStorage.getItem("privateKey");
  const user = localStorage.getItem("user");

  if (!user || !privateKey) {
    throw new Error("Not authenticated. Please login first.");
  }

  const userData = JSON.parse(user);

  return {
    "Content-Type": "application/json",
  };
}

function getAuthBody() {
  const privateKey = localStorage.getItem("privateKey");
  const user = localStorage.getItem("user");

  if (!user || !privateKey) {
    throw new Error("Not authenticated. Please login first.");
  }

  const userData = JSON.parse(user);

  return {
    userId: userData.userId,
    privateKey: privateKey,
  };
}

export async function login(userId: string, privateKey: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, privateKey }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  return response.json();
}

export async function registerDID(
  did: string,
  publicKey: string,
  keyType: string = "EcdsaSecp256k1VerificationKey2019"
): Promise<DIDRegistrationResult> {
  const response = await fetch(`${API_BASE_URL}/api/did/register`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      did,
      publicKey,
      keyType,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "DID registration failed");
  }

  return response.json();
}

export async function getDIDDocument(did: string) {
  const response = await fetch(`${API_BASE_URL}/api/did/${encodeURIComponent(did)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get DID document");
  }

  return response.json();
}

export async function isDIDActive(did: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/did/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ did }),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.isActive;
}

export async function createStatusList(issuerDID: string): Promise<StatusListResult> {
  const response = await fetch(`${API_BASE_URL}/api/credential/status-list/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      issuerDID,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Status list creation failed");
  }

  return response.json();
}

export async function issueCredential(
  issuerDID: string,
  holderDID: string,
  accessGroups: string[],
  expirationDays: number = 365,
  statusListId?: string
): Promise<CredentialIssueResult> {
  const response = await fetch(`${API_BASE_URL}/api/credential/issue`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      issuerDID,
      holderDID,
      accessGroups,
      expirationDays,
      statusListId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Credential issuance failed");
  }

  return response.json();
}

export async function revokeCredential(
  credentialId: string,
  statusListId: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/credential/revoke`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      credentialId,
      statusListId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Credential revocation failed");
  }

  return response.json();
}

export async function verifyCredential(
  jwt: string,
  statusListId?: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/verification/credential`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jwt, statusListId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Verification failed");
  }

  return response.json();
}

export async function verifyPresentation(jwt: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/verification/presentation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jwt }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Verification failed");
  }

  return response.json();
}

export function getCurrentUser(): User | null {
  const user = localStorage.getItem("user");
  if (!user) return null;
  return JSON.parse(user);
}

export function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("privateKey");
}

export interface CompanyStructure {
  departments: any[];
  allAccessTypes: any[];
}

export async function getCompanyStructure(): Promise<CompanyStructure> {
  const response = await fetch(`${API_BASE_URL}/api/company/structure`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get company structure");
  }

  const data = await response.json();
  return data.structure;
}

export async function getAllTeams() {
  const response = await fetch(`${API_BASE_URL}/api/company/teams`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get teams");
  }

  const data = await response.json();
  return data.teams;
}

export async function getAccessTypes() {
  const response = await fetch(`${API_BASE_URL}/api/company/access-types`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get access types");
  }

  const data = await response.json();
  return data.accessTypes;
}

export interface CreateEmployeeRequest {
  email: string;
  teamId: string;
  roleId: string;
  statusListId?: string;
}

export interface CreateEmployeeResponse {
  success: boolean;
  email: string;
  privateKey: string;
  did: string;
  address: string;
  teamId: string;
  roleId: string;
  accessGroups: string[];
  credential: {
    id: string;
    jwt: string;
    cid: string;
    ipfsURI: string;
  };
}

export async function createEmployee(
  email: string,
  teamId: string,
  roleId: string,
  statusListId?: string
): Promise<CreateEmployeeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/employee/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      email,
      teamId,
      roleId,
      statusListId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Employee creation failed");
  }

  return response.json();
}

export interface EmployeeAccess {
  email: string;
  did: string;
  teamId: string;
  roleId: string;
  accessGroups: string[];
  credentials: any[];
}

export async function getEmployeeAccessByDID(): Promise<EmployeeAccess> {
  const response = await fetch(`${API_BASE_URL}/api/employee/access-by-did`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(getAuthBody()),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get employee access");
  }

  const data = await response.json();
  return data;
}

export async function getEmployeeAccess(email: string): Promise<EmployeeAccess> {
  const response = await fetch(`${API_BASE_URL}/api/employee/${encodeURIComponent(email)}/access`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(getAuthBody()),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get employee access");
  }

  const data = await response.json();
  return data;
}

export async function addAccessToEmployee(
  email: string,
  accessGroups: string[],
  statusListId?: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/employee/${encodeURIComponent(email)}/add-access`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      accessGroups,
      statusListId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add access");
  }

  return response.json();
}

export async function getEmployeesByTeam(teamId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/employee/team/${encodeURIComponent(teamId)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get employees");
  }

  const data = await response.json();
  return data.employees;
}

export async function getAllEmployees(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/employees`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get employees");
  }

  const data = await response.json();
  return data.employees;
}

export interface AccessRequest {
  id: string;
  employeeEmail: string;
  employeeDID: string;
  requestedAccess: string[];
  reason: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export async function createAccessRequest(
  requestedAccess: string[],
  reason: string
): Promise<AccessRequest> {
  const response = await fetch(`${API_BASE_URL}/api/access-request/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      requestedAccess,
      reason,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create access request");
  }

  const data = await response.json();
  return data.request;
}

export async function getPendingAccessRequests(): Promise<AccessRequest[]> {
  const response = await fetch(`${API_BASE_URL}/api/access-request/pending`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(getAuthBody()),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get pending requests");
  }

  const data = await response.json();
  return data.requests;
}

export async function getMyAccessRequests(): Promise<AccessRequest[]> {
  const response = await fetch(`${API_BASE_URL}/api/access-request/my-requests`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(getAuthBody()),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get my requests");
  }

  const data = await response.json();
  return data.requests;
}

export async function approveAccessRequest(
  requestId: string,
  statusListId?: string,
  reviewNotes?: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/access-request/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      statusListId,
      reviewNotes,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to approve request");
  }

  return response.json();
}

export async function denyAccessRequest(
  requestId: string,
  reviewNotes?: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/access-request/${encodeURIComponent(requestId)}/deny`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getAuthBody(),
      reviewNotes,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to deny request");
  }

  return response.json();
}

export interface ResourceAccessResult {
  success: boolean;
  resourceId: string;
  accessLevel: "access" | "read" | "write" | "admin" | "no-access";
}

export async function checkResourceAccess(
  privateKey: string,
  resourceId: string
): Promise<ResourceAccessResult> {
  const response = await fetch(`${API_BASE_URL}/api/verification/check-resource-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      privateKey,
      resourceId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to check access");
  }

  return response.json();
}

export async function revokeEmployeeAccess(email: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/employee/${encodeURIComponent(email)}/revoke`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(getAuthBody()),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to revoke access");
  }

  return response.json();
}

export interface AuditLogEntry {
  eventId: number;
  eventType: number;
  timestamp: number;
  actorDID: string;
  details: string;
  txHash: string;
}

export async function getAuditLogs(did?: string): Promise<AuditLogEntry[]> {
  const url = did
    ? `${API_BASE_URL}/api/audit-logs?did=${encodeURIComponent(did)}`
    : `${API_BASE_URL}/api/audit-logs`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch audit logs");
  }

  const data = await response.json();
  return data.logs;
}
