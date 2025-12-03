"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import LoadingSpinner from "../shared/LoadingSpinner";
import ErrorDisplay from "../shared/ErrorDisplay";
import SuccessMessage from "../shared/SuccessMessage";
import AccessBadge from "../shared/AccessBadge";

interface CreateEmployeeFormProps {
  companyStructure: any;
  onEmployeeCreated?: () => void;
}

export default function CreateEmployeeForm({ companyStructure, onEmployeeCreated }: CreateEmployeeFormProps) {
  const [email, setEmail] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<any>(null);

  const availableTeams = selectedDepartment
    ? companyStructure.departments?.find((d: any) => d.id === selectedDepartment)?.teams || []
    : [];

  const availableRoles = selectedTeam
    ? availableTeams.find((t: any) => t.id === selectedTeam)?.roles || []
    : [];

  const defaultAccess = selectedTeam && selectedRole
    ? availableTeams.find((t: any) => t.id === selectedTeam)?.defaultAccess?.[selectedRole] || []
    : [];

  const getAccessTypeInfo = (accessId: string) => {
    return companyStructure.allAccessTypes?.find((at: any) => at.id === accessId);
  };

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !selectedTeam || !selectedRole) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setCreatedEmployee(null);

    try {
      const result = await api.createEmployee(
        email,
        selectedTeam,
        selectedRole
      );

      setCreatedEmployee(result);
      setSuccess("Employee created successfully!");
      setEmail("");
      setSelectedDepartment("");
      setSelectedTeam("");
      setSelectedRole("");

      if (onEmployeeCreated) {
        onEmployeeCreated();
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">Create New Employee</h3>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
      {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

      <form onSubmit={handleCreateEmployee} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="employee@company.com"
            className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
            required
          />
          <p className="text-xs text-gray-700 mt-1">
            Employee will receive their private key via email (mock for POC)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedTeam("");
              setSelectedRole("");
            }}
            className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
            required
          >
            <option value="">-- Select Department --</option>
            {companyStructure.departments?.map((dept: any) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Team <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedTeam}
            onChange={(e) => {
              setSelectedTeam(e.target.value);
              setSelectedRole("");
            }}
            className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
            required
            disabled={!selectedDepartment}
          >
            <option value="">-- Select Team --</option>
            {availableTeams.map((team: any) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
            required
            disabled={!selectedTeam}
          >
            <option value="">-- Select Role --</option>
            {availableRoles.map((role: string) => (
              <option key={role} value={role}>
                {role.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {defaultAccess.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Default Access for {selectedRole.replace(/-/g, " ")}:
            </p>
            <div className="flex flex-wrap gap-2">
              {defaultAccess.map((accessId: string) => {
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
        )}


        <button
          type="submit"
          disabled={loading || !email || !selectedTeam || !selectedRole}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Employee..." : "Create Employee"}
        </button>
      </form>

      {createdEmployee && (
        <div className="mt-6 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
          <h4 className="text-lg font-semibold text-green-900 mb-3">
            Employee Created Successfully!
          </h4>

          <div className="space-y-3 text-sm">
            <div>
              <strong>Email:</strong> {createdEmployee.email}
            </div>
            <div>
              <strong>DID:</strong> <code className="text-xs bg-white px-2 py-1 rounded">{createdEmployee.did}</code>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
              <p className="font-semibold text-yellow-900 mb-2">PRIVATE KEY (Save this securely!)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-xs break-all">
                  {createdEmployee.privateKey}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdEmployee.privateKey);
                    setSuccess("Private key copied to clipboard!");
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 whitespace-nowrap"
                >
                  Copy Key
                </button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                This private key is for login. Save it securely - it cannot be recovered!
              </p>
            </div>

            <div>
              <strong>Team:</strong> {createdEmployee.teamId}
            </div>
            <div>
              <strong>Role:</strong> {createdEmployee.roleId}
            </div>
            <div>
              <strong>Access Groups:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {createdEmployee.accessGroups?.map((ag: string) => {
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

