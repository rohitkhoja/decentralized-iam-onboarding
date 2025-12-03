"use client";

import { useState } from "react";
import * as api from "@/lib/api";

export default function ServiceLoginPage() {
    const [privateKey, setPrivateKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accessResult, setAccessResult] = useState<api.ResourceAccessResult | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setAccessResult(null);

        try {
            const resourceId = "dashboard-analytics";
            const result = await api.checkResourceAccess(privateKey, resourceId);
            setAccessResult(result);
        } catch (err: any) {
            setError(err.message || "Failed to verify access");
        } finally {
            setLoading(false);
        }
    };

    const getAccessColor = (level: string) => {
        switch (level) {
            case "admin": return "text-purple-600 bg-purple-100 border-purple-300";
            case "write": return "text-green-600 bg-green-100 border-green-300";
            case "read": return "text-blue-600 bg-blue-100 border-blue-300";
            case "access": return "text-green-600 bg-green-100 border-green-300";
            default: return "text-red-600 bg-red-100 border-red-300";
        }
    };

    const getAccessLabel = (level: string) => {
        switch (level) {
            case "admin": return "Admin Access";
            case "write": return "Write Access";
            case "read": return "Read Access";
            case "access": return "Access Granted";
            default: return "No Access";
        }
    };

    if (accessResult) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-gray-900">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                        <p className="text-gray-600">Service Access Verification</p>
                    </div>

                    <div className={`border-2 rounded-lg p-6 text-center mb-6 ${getAccessColor(accessResult.accessLevel)}`}>
                        <div className="text-sm font-semibold uppercase tracking-wide mb-1">Your Access Level</div>
                        <div className="text-3xl font-bold">{getAccessLabel(accessResult.accessLevel)}</div>
                    </div>

                    <div className="bg-gray-50 rounded p-4 text-sm text-gray-600 mb-6">
                        <p>
                            This dashboard has verified your identity and access rights using your decentralized identity.
                            Only the specific access rights for this service were revealed.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setAccessResult(null);
                            setPrivateKey("");
                        }}
                        className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-gray-900">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Service Login</h1>
                    <p className="text-gray-600">Login to Analytics Dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700">
                            Private Key
                        </label>
                        <input
                            type="password"
                            id="privateKey"
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                            placeholder="Enter your private key"
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Your private key is used to prove your identity. It is never stored.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? "opacity-75 cursor-not-allowed" : ""
                            }`}
                    >
                        {loading ? "Verifying..." : "Login with Identity"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
                        Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
}
