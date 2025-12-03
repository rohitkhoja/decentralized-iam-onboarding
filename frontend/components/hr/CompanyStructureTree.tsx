"use client";

import { useState } from "react";
import AccessBadge from "../shared/AccessBadge";

interface CompanyStructureTreeProps {
  structure: any;
}

export default function CompanyStructureTree({ structure }: CompanyStructureTreeProps) {
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleDepartment = (deptId: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepartments(newExpanded);
  };

  const toggleTeam = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const getAccessTypeInfo = (accessId: string) => {
    return structure.allAccessTypes?.find((at: any) => at.id === accessId);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">Company Structure</h3>
      <div className="space-y-2">
        {structure.departments?.map((dept: any) => (
          <div key={dept.id} className="border rounded-lg">
            <button
              onClick={() => toggleDepartment(dept.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{expandedDepartments.has(dept.id) ? "[-]" : "[+]"}</span>
                <span className="font-semibold text-lg">{dept.name}</span>
                <span className="text-sm text-gray-500">({dept.teams?.length || 0} teams)</span>
              </div>
              <span className="text-gray-400">
                {expandedDepartments.has(dept.id) ? "Open" : "Closed"}
              </span>
            </button>

            {expandedDepartments.has(dept.id) && (
              <div className="pl-8 pr-4 pb-4 space-y-2">
                {dept.teams?.map((team: any) => (
                  <div key={team.id} className="border-l-2 border-gray-200 pl-4">
                    <button
                      onClick={() => toggleTeam(team.id)}
                      className="w-full py-2 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span>{expandedTeams.has(team.id) ? "[-]" : "[+]"}</span>
                        <span className="font-medium">{team.name}</span>
                        <span className="text-sm text-gray-500">({team.roles?.length || 0} roles)</span>
                      </div>
                    </button>

                    {expandedTeams.has(team.id) && (
                      <div className="pl-6 space-y-3 pt-2">
                        {team.roles?.map((role: string) => (
                          <div key={role} className="bg-gray-50 rounded p-3">
                            <div className="font-medium text-sm mb-2 capitalize">{role.replace(/-/g, " ")}</div>
                            <div className="flex flex-wrap gap-2">
                              {team.defaultAccess?.[role]?.map((accessId: string) => {
                                const accessInfo = getAccessTypeInfo(accessId);
                                return (
                                  <AccessBadge
                                    key={accessId}
                                    accessId={accessId}
                                    accessName={accessInfo?.name}
                                    category={accessInfo?.category}
                                    size="sm"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

