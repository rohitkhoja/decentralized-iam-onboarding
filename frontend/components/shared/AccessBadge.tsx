"use client";

interface AccessBadgeProps {
  accessId: string;
  accessName?: string;
  category?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const categoryColors: Record<string, string> = {
  "code-repository": "bg-blue-100 text-blue-800 border-blue-300",
  "dashboard": "bg-purple-100 text-purple-800 border-purple-300",
  "network": "bg-green-100 text-green-800 border-green-300",
  "database": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "api": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "infrastructure": "bg-orange-100 text-orange-800 border-orange-300",
  "business-system": "bg-pink-100 text-pink-800 border-pink-300",
  "physical-access": "bg-red-100 text-red-800 border-red-300",
  "other": "bg-gray-100 text-gray-800 border-gray-300",
};

export default function AccessBadge({
  accessId,
  accessName,
  category = "other",
  size = "md",
  className = ""
}: AccessBadgeProps) {
  const colorClass = categoryColors[category] || categoryColors.other;

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2"
  };

  const displayName = accessName || accessId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${colorClass} ${sizeClasses[size]} ${className}`}
      title={accessId}
    >
      <span>{displayName}</span>
    </span>
  );
}

