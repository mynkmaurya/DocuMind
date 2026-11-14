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
    <div className="inline-flex flex-col items-start my-0.5 animate-fade-in-up">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-[#121a28] px-2.5 py-1 text-xs font-medium text-sky-300 shadow-[0_2px_8px_rgba(0,0,0,0.5)] hover:border-sky-400 hover:bg-[#182338] hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all duration-200">
        <button
          type="button"
          onClick={() =>
            onOpenPage(citation.document_id, citation.page_number, citation)
          }
          className="flex items-center gap-1.5 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 rounded btn-tactile"
          title={`Open PDF to Page ${citation.page_number}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_6px_#38bdf8]" />
          <span>Page {citation.page_number}</span>
        </button>
        <span className="text-slate-600 select-none">·</span>
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

      {/* Accordion Expand with Smooth CSS Transition */}
      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          showExcerpt ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        }`}
      >
        <blockquote className="max-w-lg rounded-xl border-l-2 border-sky-400 bg-[#0d131f]/95 p-3 text-xs leading-relaxed italic text-slate-300 shadow-xl backdrop-blur-md">
          “{citation.excerpt}”
        </blockquote>
      </div>
    </div>
  );
};

export default CitationLink;
