"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorDisplay from "@/components/shared/ErrorDisplay";
import SuccessMessage from "@/components/shared/SuccessMessage";
import Navigation from "@/components/shared/Navigation";

export default function IssuerPage() {
  const router = useRouter();
  const [user, setUser] = useState<api.User | null>(null);
  const [did, setDid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<any[]>([]);

  const [holderDID, setHolderDID] = useState("");
  const [accessGroups, setAccessGroups] = useState("");
  const [expirationDays, setExpirationDays] = useState(365);

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
    if (currentUser.address) {
      setDid(`did:ethr:${currentUser.address}`);
    }
  }, [router]);


  async function issueCredential() {
    if (!holderDID || !accessGroups || !did) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const groups = accessGroups.split(",").map(g => g.trim()).filter(g => g);

      const result = await api.issueCredential(
        did,
        holderDID,
        groups,
        expirationDays
      );

      setIssuedCredentials([...issuedCredentials, result]);
      setSuccess(`Credential issued: ${result.id}`);
      setHolderDID("");
      setAccessGroups("");
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function revokeCredential(credentialId: string, _statusListId: string) {
    setLoading(true);
    setError(null);
    try {
      await api.revokeCredential(credentialId, "default");
      setSuccess(`Credential ${credentialId} revoked`);
      setIssuedCredentials(issuedCredentials.map(c =>
        c.id === credentialId ? { ...c, revoked: true } : c
      ));
    } catch (error: any) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    api.logout();
    router.push("/login");
  }

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Issuer Dashboard</h1>
            <p className="text-gray-800 mt-1">Issue credentials and manage access</p>
            <p className="text-sm text-gray-700 mt-1">Logged in as: {user.userId}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>



        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow text-gray-900">
            <h2 className="text-xl font-semibold mb-2">Issue Credential to Employee</h2>
            <p className="text-sm text-gray-800 mb-4">
              Issue a verifiable credential to an employee with their access rights.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holder DID (Employee)</label>
                <input
                  type="text"
                  placeholder="did:ethr:0x..."
                  value={holderDID}
                  onChange={(e) => setHolderDID(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
                />

              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Groups</label>
                <input
                  type="text"
                  placeholder="engineering,vpn,building-access"
                  value={accessGroups}
                  onChange={(e) => setAccessGroups(e.target.value)}
                  className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration (Days)</label>
                <input
                  type="number"
                  placeholder="365"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 365)}
                  className="w-full px-4 py-2 border rounded text-gray-900 bg-white"
                />
              </div>
              <button
                onClick={issueCredential}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? "Issuing..." : "Issue Credential"}
              </button>
            </div>
          </div>

          {issuedCredentials.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow text-gray-900">
              <h2 className="text-xl font-semibold mb-2">Manage Issued Credentials</h2>
              <div className="space-y-2">
                {issuedCredentials.map((cred, idx) => (
                  <div key={idx} className="p-4 border rounded flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold">{cred.id}</p>
                      <p className="text-sm text-gray-800">IPFS: {cred.ipfsURI || "Not stored on IPFS"}</p>

                    </div>
                    <button
                      onClick={() => revokeCredential(cred.id, "default")}
                      disabled={loading || cred.revoked}
                      className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {cred.revoked ? "Revoked" : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
