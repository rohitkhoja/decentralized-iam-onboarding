"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = api.getCurrentUser();
    if (user) {
      router.push(`/${user.role}`);
    }
  }, [router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold text-center mb-4 text-gray-900">
          Decentralized IAM Onboarding System
        </h1>
        <p className="text-center text-gray-600 mb-4 text-lg">
          Blockchain-based identity and access management using Verifiable Credentials
        </p>
        <p className="text-center text-sm text-gray-700 mb-12">
          Instant employee onboarding • Privacy-preserving • Decentralized verification
        </p>

        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <Link
              href="/login"
              className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
            >
              Login to Get Started
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Link href="/login?role=issuer" className="block p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border-l-4 border-blue-500 text-gray-900">
              <div className="flex items-center justify-center">

                <h2 className="text-2xl font-bold text-gray-900">Issuer</h2>
              </div>
            </Link>

            <Link href="/login?role=holder" className="block p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border-l-4 border-green-500 text-gray-900">
              <div className="flex items-center justify-center">

                <h2 className="text-2xl font-bold text-gray-900">Holder</h2>
              </div>
            </Link>


          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 text-gray-900">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold mb-2">Issuer Creates</h3>
                <p className="text-sm text-gray-800">HR issues credentials with access rights to new employees</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h3 className="font-semibold mb-2">Holder Receives</h3>
                <p className="text-sm text-gray-800">Employee receives and stores credential in their wallet</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h3 className="font-semibold mb-2">Holder Login</h3>
                <p className="text-sm text-gray-800">Employee logs in to access their credentials</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 text-gray-900">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Partner Services</h2>
            <div className="grid md:grid-cols-1 gap-6">
              <Link href="/service-login" className="block p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition group">
                <div className="flex items-center">

                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-700">Analytics Dashboard</h3>
                    <p className="text-sm text-gray-600">Login with your decentralized identity to access analytics.</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-indigo-600 group-hover:translate-x-1 transform transition inline-block">Go</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
