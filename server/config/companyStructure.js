const companyStructure = {
  
};

function getTeamById(teamId) {
  for (const dept of companyStructure.departments) {
    const team = dept.teams.find(t => t.id === teamId);
    if (team) {
      return { ...team, department: dept };
    }
  }
  return null;
}

function getDefaultAccessForRole(teamId, roleId) {
  const team = getTeamById(teamId);
  if (!team || !team.defaultAccess[roleId]) {
    return [];
  }
  return team.defaultAccess[roleId];
}

function getAllTeams() {
  const teams = [];
  for (const dept of companyStructure.departments) {
    for (const team of dept.teams) {
      teams.push({
        ...team,
        departmentId: dept.id,
        departmentName: dept.name
      });
    }
  }
  return teams;
}

function validateTeamAndRole(teamId, roleId) {
  const team = getTeamById(teamId);
  if (!team) {
    return { valid: false, error: `Team ${teamId} not found` };
  }
  if (!team.roles.includes(roleId)) {
    return { valid: false, error: `Role ${roleId} not found in team ${teamId}` };
  }
  return { valid: true };
}

function validateAccessGroup(accessGroup) {
  return companyStructure.allAccessTypes.some(at => at.id === accessGroup);
}

module.exports = {
  companyStructure,
  getTeamById,
  getDefaultAccessForRole,
  getAllTeams,
  validateTeamAndRole,
  validateAccessGroup
};

