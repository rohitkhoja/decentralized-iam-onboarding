"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorDisplay from "@/components/shared/ErrorDisplay";
import AccessOverview from "@/components/employee/AccessOverview";
import Navigation from "@/components/shared/Navigation";

export default function EmployeePage() {
  const router = useRouter();
  const [user, setUser] = useState<api.User | null>(null);
  const [companyStructure, setCompanyStructure] = useState<any>(null);
  const [employeeAccess, setEmployeeAccess] = useState<api.EmployeeAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [structure, access] = await Promise.all([
        api.getCompanyStructure().catch(() => null),
        api.getEmployeeAccessByDID().catch(() => null),
      ]);

      setCompanyStructure(structure);
      setEmployeeAccess(access);
    } catch (error: any) {
      if (error.message.includes("Employee not found")) {
        setError(null);
        setEmployeeAccess(null);
      } else {
        setError(`Failed to load data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    api.logout();
    router.push("/login");
  }

  if (loading && !employeeAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please log in to continue</p>
      </div>
    );
  }

  const currentAccessGroups = employeeAccess?.accessGroups || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Access</h1>
            <p className="text-gray-600 mt-1">View all your current access and permissions</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Logged in as: {user.userId}</span>
            <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Logout
            </button>
          </div>
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {!employeeAccess && user && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">Employee Account Not Found</h3>
            <p className="text-yellow-800 mb-3">
              Your employee account has not been created yet through the HR Dashboard.
            </p>
            <div className="bg-white p-4 rounded border border-yellow-300 mb-3">
              <p className="text-sm font-semibold text-yellow-900 mb-2">To get access:</p>
              <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
                <li>HR must create your employee account in the HR Dashboard</li>
                <li>You will receive a private key (displayed after account creation)</li>
                <li>Log in with that private key to see your access</li>
              </ol>
            </div>
            <div className="bg-gray-100 p-3 rounded text-xs text-gray-700">
              <p className="font-semibold mb-1">Your DID (for HR reference):</p>
              <code className="bg-white px-2 py-1 rounded break-all">{`did:ethr:${user.address}`}</code>
              <p className="mt-2">Share this DID with HR so they can create your account with the correct DID.</p>
            </div>
          </div>
        )}

        {employeeAccess && companyStructure && (
          <AccessOverview
            accessGroups={currentAccessGroups}
            companyStructure={companyStructure}
          />
        )}

        {employeeAccess && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Email:</span>{" "}
                <span className="text-gray-900">{employeeAccess.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Team:</span>{" "}
                <span className="text-gray-900">{employeeAccess.teamId}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Role:</span>{" "}
                <span className="text-gray-900">{employeeAccess.roleId?.replace(/-/g, " ") || "N/A"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Total Access Types:</span>{" "}
                <span className="text-gray-900">{currentAccessGroups.length}</span>
              </div>
            </div>
          </div>
        )}

        {employeeAccess && user && (
          <AuditLogSection userDID={`did:ethr:${user.address}`} />
        )}
      </div>
    </div>
  );
}

function AuditLogSection({ userDID }: { userDID: string }) {
  const [logs, setLogs] = useState<api.AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    api.getAuditLogs(userDID)
      .then(setLogs)
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [userDID]);

  if (loading) return <div className="mt-6 p-6 text-center text-gray-500">Loading audit logs...</div>;

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6 text-gray-900">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Recent Activity (On-Chain Audit Log)</h3>
          <p className="text-sm text-gray-500">
            This log shows recent access verifications recorded on the blockchain.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No activity recorded yet</td>
              </tr>
            ) : (
              logs.map((log) => {
                let detailsObj: any = {};
                try {
                  detailsObj = JSON.parse(log.details);
                } catch (e) {
                  detailsObj = { raw: log.details };
                }

                const isGranted = log.eventType === 3;
                const isDenied = log.eventType === 4;

                if (!isGranted && !isDenied) {
                  return null;
                }

                const eventTypeMap: Record<number, string> = {
                  0: "Credential Issued",
                  1: "Credential Revoked",
                  2: "Status Updated",
                  3: "Access Granted",
                  4: "Access Denied",
                  5: "DID Registered"
                };

                const eventName = eventTypeMap[log.eventType] || `Event ${log.eventType}`;
                const isInfo = !isGranted && !isDenied;

                return (
                  <tr key={log.eventId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {eventName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {detailsObj.resourceId || log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isGranted ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Success
                        </span>
                      ) : isDenied ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Denied
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Info
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

