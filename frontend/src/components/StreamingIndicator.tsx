import React from "react";

interface StreamingIndicatorProps {
  isStreaming: boolean;
  theme?: "dark" | "light";
  onStopStream?: () => void;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  isStreaming,
  theme = "dark",
  onStopStream,
}) => {
  if (!isStreaming) return null;
  const isLight = theme === "light";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-3 border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md animate-fade-in-up ${
        isLight
          ? "border-[#4C9DB0]/40 bg-[#FFF9E6]/95 text-[#011936] shadow-[0_0_20px_rgba(76,157,176,0.2)]"
          : "border-white/20 bg-[#141414]/95 text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 animate-bounce [animation-delay:-0.24s] ${
            isLight
              ? "bg-[#4C9DB0] shadow-[0_0_8px_#4C9DB0]"
              : "bg-white shadow-[0_0_8px_#ffffff]"
          }`}
        />
        <span
          className={`h-2 w-2 animate-bounce [animation-delay:-0.12s] ${
            isLight
              ? "bg-[#387c8c] shadow-[0_0_8px_#387c8c]"
              : "bg-zinc-300 shadow-[0_0_8px_#d4d4d8]"
          }`}
        />
        <span
          className={`h-2 w-2 animate-bounce ${
            isLight
              ? "bg-[#2d6774] shadow-[0_0_8px_#2d6774]"
              : "bg-zinc-500 shadow-[0_0_8px_#71717a]"
          }`}
        />
      </span>
      <span>Generating grounded answer with citations…</span>
      {onStopStream && (
        <button
          type="button"
          onClick={onStopStream}
          className={`btn-tactile border px-2 py-0.5 text-[10px] font-semibold transition-all ${
            isLight
              ? "border-[#4C9DB0]/40 bg-[#FFEBAF] text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
              : "border-white/20 bg-[#1c1c1c] text-white hover:bg-white hover:text-black"
          }`}
        >
          Stop
        </button>
      )}
    </div>
  );
};

export default StreamingIndicator;
