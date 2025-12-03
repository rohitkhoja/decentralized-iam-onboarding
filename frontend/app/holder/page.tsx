"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorDisplay from "@/components/shared/ErrorDisplay";
import AccessOverview from "@/components/employee/AccessOverview";
import Navigation from "@/components/shared/Navigation";

export default function HolderPage() {
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
    if (currentUser.role !== "holder") {
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
        <p className="text-gray-800">Please log in to continue</p>
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
            <p className="text-gray-800 mt-1">View all your current access and permissions</p>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Logout
            </button>
          </div>
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {!employeeAccess && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg mb-8">
            <p className="text-yellow-800">
              <strong>Note:</strong> Your employee account may not be set up yet. Please contact HR to create your employee account.
            </p>
          </div>
        )}

        {employeeAccess && companyStructure && (
          <AccessOverview
            accessGroups={currentAccessGroups}
            companyStructure={companyStructure}
          />
        )}

        {employeeAccess && (
          <div className="mt-6 bg-white rounded-lg shadow p-6 text-gray-900">
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

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
