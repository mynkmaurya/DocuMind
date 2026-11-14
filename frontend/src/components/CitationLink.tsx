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
    <div className="inline-flex flex-col items-start">
      <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50/90 px-2.5 py-1 text-xs font-semibold text-indigo-800 shadow-sm">
        <button
          type="button"
          onClick={() =>
            onOpenPage(citation.document_id, citation.page_number, citation)
          }
          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
          title={`Open PDF to Page ${citation.page_number}`}
        >
          Page {citation.page_number}
        </button>
        <button
          type="button"
          aria-expanded={showExcerpt}
          aria-label={`Toggle passage excerpt for page ${citation.page_number}`}
          onClick={() => setShowExcerpt((prev) => !prev)}
          className="ml-1 rounded px-1 text-[11px] text-indigo-600 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          {showExcerpt ? "Hide quote" : "Quote"}
        </button>
      </div>

      {showExcerpt && (
        <blockquote className="mt-1.5 max-w-md rounded-lg border-l-4 border-indigo-500 bg-slate-50 p-2.5 text-xs italic text-slate-700 shadow-sm">
          “{citation.excerpt}”
        </blockquote>
      )}
    </div>
  );
};

export default CitationLink;
