const { getDefaultAccessForRole, validateAccessGroup, companyStructure } = require("../config/companyStructure");

function getDefaultAccessForEmployee(teamId, roleId) {
  return getDefaultAccessForRole(teamId, roleId);
}

function combineAccessGroups(...accessGroupArrays) {
  const combined = new Set();
  for (const accessGroups of accessGroupArrays) {
    if (Array.isArray(accessGroups)) {
      accessGroups.forEach(ag => {
        if (validateAccessGroup(ag)) {
          combined.add(ag);
        }
      });
    }
  }
  return Array.from(combined);
}

function validateAccessGroups(accessGroups) {
  const invalid = [];
  const valid = [];
  
  if (!Array.isArray(accessGroups)) {
    return { valid: false, error: "Access groups must be an array" };
  }
  
  accessGroups.forEach(ag => {
    if (validateAccessGroup(ag)) {
      valid.push(ag);
    } else {
      invalid.push(ag);
    }
  });
  
  if (invalid.length > 0) {
    return {
      valid: false,
      error: `Invalid access groups: ${invalid.join(", ")}`,
      invalid,
      valid
    };
  }
  
  return { valid: true, accessGroups: valid };
}

function getAccessTypeInfo(accessGroupId) {
  return companyStructure.allAccessTypes.find(at => at.id === accessGroupId);
}

function groupAccessByCategory(accessGroups) {
  const grouped = {};
  
  accessGroups.forEach(ag => {
    const info = getAccessTypeInfo(ag);
    if (info) {
      const category = info.category || "other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        id: ag,
        name: info.name,
        description: info.description
      });
    } else {
      if (!grouped["other"]) {
        grouped["other"] = [];
      }
      grouped["other"].push({
        id: ag,
        name: ag,
        description: "Unknown access type"
      });
    }
  });
  
  return grouped;
}

function getAccessDisplayName(accessGroupId) {
  const info = getAccessTypeInfo(accessGroupId);
  return info ? info.name : accessGroupId;
}

module.exports = {
  getDefaultAccessForEmployee,
  combineAccessGroups,
  validateAccessGroups,
  getAccessTypeInfo,
  groupAccessByCategory,
  getAccessDisplayName
};

