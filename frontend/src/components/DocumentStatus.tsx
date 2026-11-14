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
      badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
      dotClass: "bg-sky-500 animate-pulse",
    },
    processing: {
      label: "Processing",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      dotClass: "bg-amber-500 animate-pulse",
    },
    ready: {
      label: pageCount ? `Ready (${pageCount} pages)` : "Ready",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dotClass: "bg-emerald-500",
    },
    error: {
      label: "Failed",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      dotClass: "bg-rose-500",
    },
  };

  const current = styles[status] || styles.processing;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${current.dotClass}`} />
        {current.label}
      </span>
      {status === "error" && errorMessage && (
        <p className="text-xs text-rose-600 line-clamp-2 mt-0.5">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default DocumentStatus;
