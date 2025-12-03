"use client";

import { useState } from "react";

interface DIDDisplayProps {
  did: string;
  showCopy?: boolean;
}

export default function DIDDisplay({ did, showCopy = true }: DIDDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(did);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="px-3 py-2 bg-gray-100 rounded text-sm font-mono">
        {did}
      </code>
      {showCopy && (
        <button
          onClick={copyToClipboard}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
    </div>
  );
}

