import React from "react";

interface StreamingIndicatorProps {
  isStreaming: boolean;
  onStopStream?: () => void;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  isStreaming,
  onStopStream,
}) => {
  if (!isStreaming) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-3 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-medium text-indigo-800"
    >
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600" />
      </span>
      <span>Streaming grounded answer…</span>
      {onStopStream && (
        <button
          type="button"
          onClick={onStopStream}
          className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          Stop
        </button>
      )}
    </div>
  );
};

export default StreamingIndicator;
