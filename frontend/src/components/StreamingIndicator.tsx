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
      className="inline-flex items-center gap-3 rounded-full border border-sky-500/40 bg-[#0c1320]/90 px-3.5 py-1.5 text-xs font-medium text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.25)] backdrop-blur-md"
    >
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.2s] shadow-[0_0_6px_#38bdf8]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.1s] shadow-[0_0_6px_#06b6d4]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
      </span>
      <span>Generating grounded answer with citations…</span>
      {onStopStream && (
        <button
          type="button"
          onClick={onStopStream}
          className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 shadow-sm hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 transition-colors"
        >
          Stop
        </button>
      )}
    </div>
  );
};

export default StreamingIndicator;
