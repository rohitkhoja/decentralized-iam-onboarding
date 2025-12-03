"use client";

import { useState } from "react";
import * as api from "@/lib/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorDisplay from "@/components/shared/ErrorDisplay";
import SuccessMessage from "@/components/shared/SuccessMessage";
import StatusIndicator from "@/components/shared/StatusIndicator";

export default function VerifierPage() {
  const [vcJwt, setVcJwt] = useState("");
  const [statusListId, setStatusListId] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<any[]>([]);

  async function verifyCredential() {
    if (!vcJwt) {
      setError("Please paste a credential JWT");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.verifyCredential(vcJwt, statusListId || undefined);

      setVerificationResult(result);
      setVerificationHistory([result, ...verificationHistory]);

      if (result.valid) {
        setSuccess("Credential is valid!");
        setError(null);
      } else {
        setError(`Credential verification failed: ${result.errors?.join(", ") || "Unknown error"}`);
        setSuccess(null);
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function verifyPresentation() {
    if (!vcJwt) {
      setError("Please paste a presentation JWT");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.verifyPresentation(vcJwt);

      setVerificationResult(result);
      setVerificationHistory([result, ...verificationHistory]);

      if (result.valid) {
        setSuccess("Presentation is valid!");
        setError(null);
      } else {
        setError(`Presentation verification failed: ${result.errors?.join(", ") || "Unknown error"}`);
        setSuccess(null);
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Verifier Dashboard</h1>
            <p className="text-gray-600 mt-1">Access Controllers - Verify credentials and grant/deny access</p>
          </div>
        </div>



        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />}

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Verify Credential or Presentation</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste a credential or presentation JWT to verify its validity. Check signature, expiration, and revocation status.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credential/Presentation JWT</label>
                <textarea
                  placeholder="Paste JWT-VC or JWT-VP here (starts with eyJ...)"
                  value={vcJwt}
                  onChange={(e) => setVcJwt(e.target.value)}
                  className="w-full px-4 py-2 border rounded h-32 font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">Paste the JWT string</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status List ID (Optional)</label>
                <input
                  type="text"
                  placeholder="status-list-company-2024"
                  value={statusListId}
                  onChange={(e) => setStatusListId(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">Enter if you want to check revocation status</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={verifyCredential}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify Credential"}
                </button>
                <button
                  onClick={verifyPresentation}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify Presentation"}
                </button>
              </div>
            </div>
          </div>

          {verificationResult && (
            <div className={`bg-white p-6 rounded-lg shadow border-2 ${verificationResult.valid ? "border-green-500" : "border-red-500"
              }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Verification Result</h2>
                <StatusIndicator
                  status={verificationResult.valid ? "valid" : "revoked"}
                />
              </div>

              <div className="space-y-3">
                {verificationResult.credential && (
                  <>
                    <div>
                      <strong>Credential ID:</strong>{" "}
                      <code className="text-sm">{verificationResult.credential.id}</code>
                    </div>
                    <div>
                      <strong>Issuer:</strong> {verificationResult.credential.issuer}
                    </div>
                    {verificationResult.credential.credentialSubject && (
                      <div>
                        <strong>Subject:</strong>{" "}
                        {verificationResult.credential.credentialSubject.id ||
                          verificationResult.credential.credentialSubject.did}
                      </div>
                    )}
                    {verificationResult.credential.credentialSubject?.accessGroups && (
                      <div>
                        <strong>Access Groups:</strong>{" "}
                        {verificationResult.credential.credentialSubject.accessGroups.join(", ")}
                      </div>
                    )}
                    {verificationResult.expiration && (
                      <div>
                        <strong>Expiration:</strong>{" "}
                        {verificationResult.expiration.expired ? "Expired" :
                          `${verificationResult.expiration.daysUntilExpiration} days remaining`}
                      </div>
                    )}
                  </>
                )}



                {verificationResult.errors && verificationResult.errors.length > 0 && (
                  <div>
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {verificationResult.errors.map((err: string, idx: number) => (
                        <li key={idx} className="text-red-600">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {verificationHistory.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Verification History</h2>
              <div className="space-y-2">
                {verificationHistory.slice(0, 10).map((result, idx) => (
                  <div key={idx} className="p-3 border rounded flex justify-between items-center">
                    <div>
                      <StatusIndicator status={result.valid ? "valid" : "revoked"} />
                      {result.credential && (
                        <span className="ml-2 text-sm text-gray-600">
                          {result.credential.id?.slice(0, 30)}...
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleTimeString()}
                    </span>
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
