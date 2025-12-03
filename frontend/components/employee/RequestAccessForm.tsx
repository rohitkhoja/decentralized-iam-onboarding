"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import LoadingSpinner from "../shared/LoadingSpinner";
import ErrorDisplay from "../shared/ErrorDisplay";
import SuccessMessage from "../shared/SuccessMessage";

interface RequestAccessFormProps {
  companyStructure: any;
  currentAccess: string[];
  onRequestCreated?: () => void;
}

export default function RequestAccessForm({
  companyStructure,
  currentAccess,
  onRequestCreated
}: RequestAccessFormProps) {
  const [selectedAccessGroups, setSelectedAccessGroups] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allAccessTypes = companyStructure?.allAccessTypes || [];
  const availableAccessTypes = allAccessTypes.filter((at: any) => !currentAccess.includes(at.id));

  const groupedAccess = availableAccessTypes.reduce((acc: any, access: any) => {
    const category = access.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(access);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedAccessGroups.length === 0) {
      setError("Please select at least one access type");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for the access request");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.createAccessRequest(selectedAccessGroups, reason);
      setSuccess("Access request submitted successfully!");
      setSelectedAccessGroups([]);
      setReason("");
      if (onRequestCreated) {
        onRequestCreated();
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

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">Request Special Access</h3>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
      {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Access Types <span className="text-red-500">*</span>
          </label>
          {availableAccessTypes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded text-gray-500">
              You already have all available access types
            </div>
          ) : (
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
          )}
          {selectedAccessGroups.length > 0 && (
            <div className="mt-2 text-sm text-gray-800">
              Selected: {selectedAccessGroups.length} access type(s)
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Request <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need this access..."
            className="w-full px-4 py-2 border rounded h-24 text-gray-900 bg-white"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || selectedAccessGroups.length === 0 || !reason.trim() || availableAccessTypes.length === 0}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting Request..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}

