"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import LoadingSpinner from "../shared/LoadingSpinner";
import ErrorDisplay from "../shared/ErrorDisplay";
import SuccessMessage from "../shared/SuccessMessage";

interface GrantAccessFormProps {
  employees: any[];
  companyStructure: any;
  onAccessGranted?: () => void;
}

export default function GrantAccessForm({
  employees,
  companyStructure,
  onAccessGranted
}: GrantAccessFormProps) {
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState("");
  const [selectedAccessGroups, setSelectedAccessGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allAccessTypes = companyStructure.allAccessTypes || [];

  async function handleGrantAccess(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedEmployeeEmail || selectedAccessGroups.length === 0) {
      setError("Please select an employee and at least one access type");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.addAccessToEmployee(
        selectedEmployeeEmail,
        selectedAccessGroups
      );

      setSuccess("Access granted successfully!");
      setSelectedEmployeeEmail("");
      setSelectedAccessGroups([]);

      if (onAccessGranted) {
        onAccessGranted();
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleAccessGroup(accessId: string) {
    setSelectedAccessGroups(prev => {
      if (prev.includes(accessId)) {
        return prev.filter(id => id !== accessId);
      } else {
        return [...prev, accessId];
      }
    });
  }

  const groupedAccess = allAccessTypes.reduce((acc: any, access: any) => {
    const category = access.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(access);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">Grant Additional Access to Employee</h3>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
      {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

      <form onSubmit={handleGrantAccess} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Employee <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedEmployeeEmail}
            onChange={(e) => setSelectedEmployeeEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
            required
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp.email} value={emp.email}>
                {emp.email} ({emp.teamId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Access Types <span className="text-red-500">*</span>
          </label>
          <div className="border rounded p-4 max-h-64 overflow-y-auto space-y-4">
            {Object.entries(groupedAccess).map(([category, accesses]: [string, any]) => (
              <div key={category}>
                <div className="font-semibold text-sm mb-2 capitalize">
                  {category.replace(/-/g, " ")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {accesses.map((access: any) => (
                    <label
                      key={access.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAccessGroups.includes(access.id)}
                        onChange={() => toggleAccessGroup(access.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{access.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selectedAccessGroups.length > 0 && (
            <div className="mt-2 text-sm text-gray-800">
              Selected: {selectedAccessGroups.length} access type(s)
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !selectedEmployeeEmail || selectedAccessGroups.length === 0}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Granting Access..." : "Grant Access"}
        </button>
      </form>
    </div>
  );
}

