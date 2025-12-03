"use client";

interface StatusIndicatorProps {
  status: "valid" | "revoked" | "expired" | "pending";
  label?: string;
}

export default function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const colors = {
    valid: "bg-green-100 text-green-800 border-green-300",
    revoked: "bg-red-100 text-red-800 border-red-300",
    expired: "bg-yellow-100 text-yellow-800 border-yellow-300",
    pending: "bg-gray-100 text-gray-800 border-gray-300"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[status]}`}>
      {label || status.toUpperCase()}
    </span>
  );
}

