import React, { useState } from "react";
import { Citation } from "../types/documind";

interface CitationLinkProps {
  citation: Citation;
  onOpenPage: (
    documentId: string,
    pageNumber: number,
    citation: Citation
  ) => void;
}

export const CitationLink: React.FC<CitationLinkProps> = ({
  citation,
  onOpenPage,
}) => {
  const [showExcerpt, setShowExcerpt] = useState(false);

  return (
    <div className="inline-flex flex-col items-start my-0.5">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-[#121a28] px-2.5 py-1 text-xs font-medium text-sky-300 shadow-[0_2px_8px_rgba(0,0,0,0.5)] hover:border-sky-400 hover:bg-[#182338] transition-all">
        <button
          type="button"
          onClick={() =>
            onOpenPage(citation.document_id, citation.page_number, citation)
          }
          className="flex items-center gap-1 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 rounded"
          title={`Open PDF to Page ${citation.page_number}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          Page {citation.page_number}
        </button>
        <span className="text-slate-600">·</span>
        <button
          type="button"
          aria-expanded={showExcerpt}
          aria-label={`Toggle quote for page ${citation.page_number}`}
          onClick={() => setShowExcerpt((prev) => !prev)}
          className="rounded px-1 text-[11px] font-medium text-slate-400 hover:text-sky-200 hover:bg-sky-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 transition-colors"
        >
          {showExcerpt ? "Hide quote" : "Quote"}
        </button>
      </div>

      {showExcerpt && (
        <blockquote className="mt-2 max-w-lg rounded-xl border-l-2 border-sky-400 bg-[#0d131f]/95 p-3 text-xs leading-relaxed italic text-slate-300 shadow-xl backdrop-blur-md">
          “{citation.excerpt}”
        </blockquote>
      )}
    </div>
  );
};

export default CitationLink;
