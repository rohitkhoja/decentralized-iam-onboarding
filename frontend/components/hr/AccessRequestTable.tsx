"use client";

import * as api from "@/lib/api";
import AccessBadge from "../shared/AccessBadge";

interface AccessRequestTableProps {
  requests: api.AccessRequest[];
  companyStructure: any;
  onApprove?: (requestId: string) => void;
  onDeny?: (requestId: string) => void;
  loading?: boolean;
}

export default function AccessRequestTable({
  requests,
  companyStructure,
  onApprove,
  onDeny,
  loading = false
}: AccessRequestTableProps) {
  const getAccessTypeInfo = (accessId: string) => {
    return companyStructure.allAccessTypes?.find((at: any) => at.id === accessId);
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-gray-900">
        <h3 className="text-xl font-semibold mb-4">Access Requests</h3>
        <div className="text-center py-8 text-gray-500">
          No pending requests
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">Access Requests</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-4">Employee</th>
              <th className="text-left py-2 px-4">Requested Access</th>
              <th className="text-left py-2 px-4">Reason</th>
              <th className="text-left py-2 px-4">Date</th>
              <th className="text-left py-2 px-4">Status</th>
              <th className="text-left py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="text-sm font-medium">{request.employeeEmail}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {request.requestedAccess.map((accessId) => {
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
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-800 max-w-xs truncate" title={request.reason}>
                    {request.reason || "-"}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-800">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${statusColors[request.status] || statusColors.pending
                      }`}
                  >
                    {request.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApprove?.(request.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onDeny?.(request.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                  {request.status !== "pending" && (
                    <div className="text-xs text-gray-500">
                      {request.reviewedBy && `By: ${request.reviewedBy}`}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

