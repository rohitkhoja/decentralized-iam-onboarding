"use client";

interface ErrorDisplayProps {
  error: string | Error;
  onDismiss?: () => void;
}

export default function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-start">
      <div className="flex-1">
        <h3 className="text-red-800 font-semibold mb-1">Error</h3>
        <p className="text-red-600 text-sm">{errorMessage}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 ml-4"
        >
          ×
        </button>
      )}
    </div>
  );
}

