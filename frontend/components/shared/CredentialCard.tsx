"use client";

interface CredentialCardProps {
  credential: {
    id: string;
    type?: string[];
    issuer?: string;
    expirationDate?: string;
    accessGroups?: string[];
    [key: string]: any;
  };
  onSelect?: () => void;
  showStatus?: boolean;
  status?: "valid" | "revoked" | "expired";
}

export default function CredentialCard({ credential, onSelect, showStatus = false, status }: CredentialCardProps) {
  const isExpired = credential.expirationDate
    ? new Date(credential.expirationDate) < new Date()
    : false;

  const displayStatus = status || (isExpired ? "expired" : "valid");

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition ${displayStatus === "valid" ? "border-green-300" :
          displayStatus === "revoked" ? "border-red-300" :
            "border-yellow-300"
        }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{credential.id?.slice(0, 20)}...</h3>
        {showStatus && (
          <span className={`px-2 py-1 rounded text-xs ${displayStatus === "valid" ? "bg-green-100 text-green-800" :
              displayStatus === "revoked" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
            }`}>
            {displayStatus.toUpperCase()}
          </span>
        )}
      </div>

      {credential.type && (
        <p className="text-sm text-gray-800 mb-2">
          {Array.isArray(credential.type) ? credential.type.join(", ") : credential.type}
        </p>
      )}

      {credential.issuer && (
        <p className="text-xs text-gray-700 mb-1">
          Issuer: {credential.issuer.slice(0, 20)}...
        </p>
      )}

      {credential.expirationDate && (
        <p className="text-xs text-gray-700">
          Expires: {new Date(credential.expirationDate).toLocaleDateString()}
        </p>
      )}

      {credential.accessGroups && credential.accessGroups.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {credential.accessGroups.map((group: string, idx: number) => (
            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              {group}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

