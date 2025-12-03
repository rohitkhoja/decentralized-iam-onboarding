"use client";

import * as api from "@/lib/api";
import AccessBadge from "../shared/AccessBadge";

interface MyRequestsListProps {
  requests: api.AccessRequest[];
  companyStructure: any;
}

export default function MyRequestsList({ requests, companyStructure }: MyRequestsListProps) {
  const getAccessTypeInfo = (accessId: string) => {
    return companyStructure?.allAccessTypes?.find((at: any) => at.id === accessId);
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    denied: "bg-red-100 text-red-800 border-red-300",
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-gray-900">
        <h3 className="text-xl font-semibold mb-4">My Access Requests</h3>
        <div className="text-center py-8 text-gray-500">
          No requests submitted yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">My Access Requests</h3>
      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className={`border-2 rounded-lg p-4 ${statusColors[request.status] || statusColors.pending}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold">Request #{request.id.slice(-8)}</div>
              <span className="px-3 py-1 rounded text-xs font-medium bg-white">
                {request.status.toUpperCase()}
              </span>
            </div>

            <div className="mb-2">
              <strong>Requested Access:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
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
            </div>

            <div className="mb-2">
              <strong>Reason:</strong>
              <p className="text-sm mt-1">{request.reason || "-"}</p>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <div>Requested: {new Date(request.requestedAt).toLocaleString()}</div>
              {request.reviewedAt && (
                <div>Reviewed: {new Date(request.reviewedAt).toLocaleString()}</div>
              )}
              {request.reviewedBy && (
                <div>Reviewed by: {request.reviewedBy}</div>
              )}
              {request.reviewNotes && (
                <div>Notes: {request.reviewNotes}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

