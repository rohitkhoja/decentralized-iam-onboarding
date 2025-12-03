const employeeStorage = require("../storage/employeeStorage");
const { validateAccessGroups } = require("../utils/accessMapper");

const requests = new Map();
let requestCounter = 0;

function generateRequestId() {
  requestCounter++;
  return `req-${Date.now()}-${requestCounter}`;
}

function createAccessRequest(employeeEmail, employeeDID, requestedAccess, reason) {
  const validation = validateAccessGroups(requestedAccess);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const employee = employeeStorage.getEmployee(employeeEmail);
  if (!employee) {
    throw new Error(`Employee with email ${employeeEmail} not found`);
  }

  const requestId = generateRequestId();
  const request = {
    id: requestId,
    employeeEmail,
    employeeDID: employeeDID || employee.did,
    requestedAccess: validation.accessGroups,
    reason: reason || "",
    status: "pending",
    requestedAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null
  };

  requests.set(requestId, request);
  return request;
}

function getRequest(requestId) {
  return requests.get(requestId) || null;
}

function getAllRequests() {
  return Array.from(requests.values());
}

function getPendingRequests() {
  return Array.from(requests.values()).filter(req => req.status === "pending");
}

function getRequestsByEmployee(employeeEmail) {
  return Array.from(requests.values()).filter(req => req.employeeEmail === employeeEmail);
}

function approveRequest(requestId, reviewedBy, reviewNotes = null) {
  const request = requests.get(requestId);
  if (!request) {
    throw new Error(`Request ${requestId} not found`);
  }

  if (request.status !== "pending") {
    throw new Error(`Request ${requestId} is already ${request.status}`);
  }

  request.status = "approved";
  request.reviewedBy = reviewedBy;
  request.reviewedAt = new Date().toISOString();
  request.reviewNotes = reviewNotes;

  requests.set(requestId, request);
  return request;
}

function denyRequest(requestId, reviewedBy, reviewNotes = null) {
  const request = requests.get(requestId);
  if (!request) {
    throw new Error(`Request ${requestId} not found`);
  }

  if (request.status !== "pending") {
    throw new Error(`Request ${requestId} is already ${request.status}`);
  }

  request.status = "denied";
  request.reviewedBy = reviewedBy;
  request.reviewedAt = new Date().toISOString();
  request.reviewNotes = reviewNotes;

  requests.set(requestId, request);
  return request;
}

function clearAllRequests() {
  requests.clear();
  requestCounter = 0;
}

module.exports = {
  createAccessRequest,
  getRequest,
  getAllRequests,
  getPendingRequests,
  getRequestsByEmployee,
  approveRequest,
  denyRequest,
  clearAllRequests
};

