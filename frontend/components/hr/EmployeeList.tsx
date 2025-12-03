"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import AccessBadge from "../shared/AccessBadge";

interface EmployeeListProps {
  employees: any[];
  companyStructure: any;
  onEmployeeSelected?: (email: string) => void;
}

export default function EmployeeList({ employees, companyStructure, onEmployeeSelected }: EmployeeListProps) {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  const filteredEmployees = employees.filter(emp => {
    if (selectedDepartment && emp.departmentId !== selectedDepartment) return false;
    if (selectedTeam && emp.teamId !== selectedTeam) return false;
    return true;
  });

  const getAccessTypeInfo = (accessId: string) => {
    return companyStructure.allAccessTypes?.find((at: any) => at.id === accessId);
  };

  const getTeamName = (teamId: string) => {
    for (const dept of companyStructure.departments || []) {
      const team = dept.teams.find((t: any) => t.id === teamId);
      if (team) return team.name;
    }
    return teamId;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">All Employees</h3>

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Department</label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedTeam("");
            }}
            className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
          >
            <option value="">All Departments</option>
            {companyStructure.departments?.map((dept: any) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Team</label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
          >
            <option value="">All Teams</option>
            {companyStructure.departments
              ?.find((d: any) => d.id === selectedDepartment || !selectedDepartment)
              ?.teams?.map((team: any) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No employees found
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.email}
              className="border rounded p-4 hover:bg-gray-50 transition cursor-pointer"
              onClick={() => onEmployeeSelected?.(emp.email)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold">{emp.email}</div>
                  <div className="text-sm text-gray-800">
                    Team: {getTeamName(emp.teamId)} | Role: {emp.roleId?.replace(/-/g, " ")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {emp.accessGroups?.slice(0, 5).map((ag: string) => {
                      const accessInfo = getAccessTypeInfo(ag);
                      return (
                        <AccessBadge
                          key={ag}
                          accessId={ag}
                          accessName={accessInfo?.name}
                          category={accessInfo?.category}
                          size="sm"
                        />
                      );
                    })}
                    {emp.accessGroups?.length > 5 && (
                      <span className="text-xs text-gray-500 self-center">
                        +{emp.accessGroups.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to revoke all access for ${emp.email}? This action cannot be undone.`)) {
                        try {
                          await api.revokeEmployeeAccess(emp.email);
                          alert("Access revoked successfully");
                        } catch (err: any) {
                          alert("Failed to revoke access: " + err.message);
                        }
                      }
                    }}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

