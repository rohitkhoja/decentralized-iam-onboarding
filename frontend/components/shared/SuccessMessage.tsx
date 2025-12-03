"use client";

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function SuccessMessage({ message, onDismiss }: SuccessMessageProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-start">
      <div className="flex-1">
        <h3 className="text-green-800 font-semibold mb-1">Success</h3>
        <p className="text-green-600 text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-green-600 hover:text-green-800 ml-4"
        >
          ×
        </button>
      )}
    </div>
  );
}

