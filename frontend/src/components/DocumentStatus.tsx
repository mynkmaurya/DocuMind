import React from "react";
import { DocumentStatusType } from "../types/documind";

interface DocumentStatusProps {
  status: DocumentStatusType;
  pageCount?: number | null;
  errorMessage?: string | null;
  theme?: "dark" | "light";
}

export const DocumentStatus: React.FC<DocumentStatusProps> = ({
  status,
  pageCount,
  errorMessage,
  theme = "dark",
}) => {
  const isLight = theme === "light";

  const styles: Record<
    DocumentStatusType,
    { label: string; badgeClass: string; dotClass: string }
  > = {
    uploading: {
      label: "Uploading",
      badgeClass: isLight
        ? "bg-[#4C9DB0]/15 text-[#4C9DB0] border-[#4C9DB0]/40"
        : "bg-white/10 text-white border-white/25",
      dotClass: isLight
        ? "bg-[#4C9DB0] animate-pulse"
        : "bg-white animate-pulse shadow-[0_0_8px_#ffffff]",
    },
    processing: {
      label: "Processing",
      badgeClass: isLight
        ? "bg-amber-500/15 text-amber-800 border-amber-500/40"
        : "bg-zinc-800 text-zinc-200 border-zinc-600",
      dotClass: isLight
        ? "bg-amber-500 animate-pulse"
        : "bg-zinc-300 animate-pulse shadow-[0_0_8px_#d4d4d8]",
    },
    ready: {
      label: pageCount ? `Ready (${pageCount} pages)` : "Ready",
      badgeClass: isLight
        ? "bg-emerald-500/15 text-emerald-800 border-emerald-500/40"
        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      dotClass: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
    },
    error: {
      label: "Failed",
      badgeClass: isLight
        ? "bg-rose-500/15 text-rose-800 border-rose-500/40"
        : "bg-rose-500/10 text-rose-300 border-rose-500/30",
      dotClass: "bg-rose-400 shadow-[0_0_8px_#fb7185]",
    },
  };

  const current = styles[status] || styles.processing;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 self-start border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${current.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 ${current.dotClass}`} />
        {current.label}
      </span>
      {status === "error" && errorMessage && (
        <p className="text-xs text-rose-400 line-clamp-2 mt-0.5">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default DocumentStatus;
