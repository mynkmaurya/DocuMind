import React from "react";
import { DocumentStatusType } from "../types/documind";

interface DocumentStatusProps {
  status: DocumentStatusType;
  pageCount?: number | null;
  errorMessage?: string | null;
}

export const DocumentStatus: React.FC<DocumentStatusProps> = ({
  status,
  pageCount,
  errorMessage,
}) => {
  const styles: Record<
    DocumentStatusType,
    { label: string; badgeClass: string; dotClass: string }
  > = {
    uploading: {
      label: "Uploading",
      badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/30",
      dotClass: "bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]",
    },
    processing: {
      label: "Processing",
      badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      dotClass: "bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]",
    },
    ready: {
      label: pageCount ? `Ready (${pageCount} pages)` : "Ready",
      badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      dotClass: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
    },
    error: {
      label: "Failed",
      badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      dotClass: "bg-rose-400 shadow-[0_0_8px_#fb7185]",
    },
  };

  const current = styles[status] || styles.processing;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${current.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${current.dotClass}`} />
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
