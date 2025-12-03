"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as api from "@/lib/api";

export default function Navigation() {
  const pathname = usePathname();
  const user = api.getCurrentUser();

  if (!user) {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b mb-6 text-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-blue-600">
              IAM System
            </Link>
            <div className="flex space-x-1">
              {user.role === "issuer" && (
                <Link
                  href="/hr"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive("/hr")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  HR Dashboard
                </Link>
              )}
              {user.role === "holder" && (
                <Link
                  href="/employee"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive("/employee")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  Employee Dashboard
                </Link>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {user.userId} ({user.role})
          </div>
        </div>
      </div>
    </nav>
  );
}

