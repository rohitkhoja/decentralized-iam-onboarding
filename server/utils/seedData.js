const seedDefaultEmployees = async (employeeService, issuerDID, issuerPrivateKey, defaultStatusListId) => {
    const employees = [
        { email: "alice.frontend@company.com", teamId: "frontend-team", roleId: "team-lead" },
        { email: "bob.frontend@company.com", teamId: "frontend-team", roleId: "senior" },
        { email: "charlie.frontend@company.com", teamId: "frontend-team", roleId: "junior" },
        { email: "david.frontend@company.com", teamId: "frontend-team", roleId: "intern" },
        { email: "eve.backend@company.com", teamId: "backend-team", roleId: "team-lead" },
        { email: "frank.backend@company.com", teamId: "backend-team", roleId: "senior" },
        { email: "grace.backend@company.com", teamId: "backend-team", roleId: "junior" },
        { email: "heidi.devops@company.com", teamId: "devops-team", roleId: "team-lead" },
        { email: "ivan.devops@company.com", teamId: "devops-team", roleId: "senior" },
        { email: "judy.sales@company.com", teamId: "enterprise-sales", roleId: "senior" },
        { email: "mallory.sales@company.com", teamId: "midmarket-sales", roleId: "junior" },
        { email: "olivia.hr@company.com", teamId: "hr-team", roleId: "team-lead" },
        { email: "peggy.hr@company.com", teamId: "hr-team", roleId: "senior" },
        { email: "sybil.finance@company.com", teamId: "finance-team", roleId: "senior" },
        { email: "trent.legal@company.com", teamId: "legal-team", roleId: "team-lead" }
    ];

    let createdCount = 0;

    for (const emp of employees) {
        try {
            const existing = employeeService.getEmployeeByEmail(emp.email);
            if (!existing) {
                await employeeService.createEmployee(
                    emp.email,
                    emp.teamId,
                    emp.roleId,
                    issuerDID,
                    issuerPrivateKey,
                    defaultStatusListId
                );
                createdCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (err) {
        }
    }
};

module.exports = seedDefaultEmployees;
