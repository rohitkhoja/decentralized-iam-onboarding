"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorDisplay from "@/components/shared/ErrorDisplay";
import CompanyStructureTree from "@/components/hr/CompanyStructureTree";
import CreateEmployeeForm from "@/components/hr/CreateEmployeeForm";
import EmployeeList from "@/components/hr/EmployeeList";
import AccessRequestTable from "@/components/hr/AccessRequestTable";
import GrantAccessForm from "@/components/hr/GrantAccessForm";
import Navigation from "@/components/shared/Navigation";
import SuccessMessage from "@/components/shared/SuccessMessage";

export default function HRPage() {
  const router = useRouter();
  const [user, setUser] = useState<api.User | null>(null);
  const [companyStructure, setCompanyStructure] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<api.AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "employees" | "requests" | "grant" | "structure">("create");

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role !== "issuer") {
      router.push(`/${currentUser.role}`);
      return;
    }
    setUser(currentUser);
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [structure, employeesList, requestsList] = await Promise.all([
        api.getCompanyStructure(),
        api.getAllEmployees(),
        api.getPendingAccessRequests(),
      ]);
      setCompanyStructure(structure);
      setEmployees(employeesList);
      setPendingRequests(requestsList);
    } catch (error: any) {
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveRequest(requestId: string) {
    setLoading(true);
    setError(null);
    try {
      await api.approveAccessRequest(requestId, undefined, undefined);
      setSuccess("Request approved and access granted!");
      await loadData();
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDenyRequest(requestId: string) {
    setLoading(true);
    setError(null);
    try {
      await api.denyAccessRequest(requestId);
      setSuccess("Request denied");
      await loadData();
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    api.logout();
    router.push("/login");
  }

  if (loading && !companyStructure) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || user.role !== "issuer") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-800">Please log in as HR/Issuer to continue</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">HR Dashboard</h1>
            <p className="text-gray-800 mt-1">Manage employees, access, and company structure</p>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Logout
            </button>
          </div>
        </div>



        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

        <div className="mb-6">
          <div className="flex space-x-2 border-b">
            {[
              { id: "create", label: "Create Employee" },
              { id: "employees", label: "View Employees" },
              { id: "requests", label: "Access Requests" },
              { id: "grant", label: "Grant Access" },
              { id: "structure", label: "Company Structure" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-800 hover:text-gray-900"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "structure" && companyStructure && (
          <CompanyStructureTree structure={companyStructure} />
        )}

        {activeTab === "create" && companyStructure && (
          <CreateEmployeeForm
            companyStructure={companyStructure}
            onEmployeeCreated={loadData}
          />
        )}

        {activeTab === "employees" && companyStructure && (
          <EmployeeList
            employees={employees}
            companyStructure={companyStructure}
          />
        )}

        {activeTab === "requests" && companyStructure && (
          <AccessRequestTable
            requests={pendingRequests}
            companyStructure={companyStructure}
            onApprove={handleApproveRequest}
            onDeny={handleDenyRequest}
            loading={loading}
          />
        )}

        {activeTab === "grant" && companyStructure && (
          <GrantAccessForm
            employees={employees}
            companyStructure={companyStructure}
            onAccessGranted={loadData}
          />
        )}
      </div>
    </div>
  );
}

