import React, { useState } from "react";
import { Citation } from "../types/documind";

interface CitationLinkProps {
  citation: Citation;
  theme?: "dark" | "light";
  onOpenPage: (
    documentId: string,
    pageNumber: number,
    citation: Citation
  ) => void;
}

export const CitationLink: React.FC<CitationLinkProps> = ({
  citation,
  theme = "dark",
  onOpenPage,
}) => {
  const [showExcerpt, setShowExcerpt] = useState(false);
  const isLight = theme === "light";

  return (
    <div className="inline-flex flex-col items-start my-0.5 animate-fade-in-up">
      <div
        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
          isLight
            ? "border-[#4C9DB0]/40 bg-[#FFF9E6] text-[#011936] hover:border-[#4C9DB0] hover:bg-[#4C9DB0] hover:text-white shadow-sm"
            : "border-white/20 bg-[#161616] text-white hover:border-white hover:bg-white hover:text-black shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        }`}
      >
        <button
          type="button"
          onClick={() =>
            onOpenPage(citation.document_id, citation.page_number, citation)
          }
          className="flex items-center gap-1.5 font-semibold focus-visible:outline-none btn-tactile"
          title={`Open PDF to Page ${citation.page_number}`}
        >
          <span
            className={`w-1.5 h-1.5 animate-pulse ${
              isLight
                ? "bg-[#4C9DB0] shadow-[0_0_6px_#4C9DB0]"
                : "bg-white shadow-[0_0_6px_#ffffff]"
            }`}
          />
          <span>Page {citation.page_number}</span>
        </button>
        <span className="opacity-40 select-none">·</span>
        <button
          type="button"
          aria-expanded={showExcerpt}
          aria-label={`Toggle quote for page ${citation.page_number}`}
          onClick={() => setShowExcerpt((prev) => !prev)}
          className={`px-1 text-[11px] font-medium transition-colors ${
            isLight
              ? "text-[#395d6a] hover:text-[#011936]"
              : "text-zinc-400 hover:text-white"
          }`}
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
        <blockquote
          className={`max-w-lg border-l-2 p-3 text-xs leading-relaxed italic shadow-xl backdrop-blur-md ${
            isLight
              ? "border-[#4C9DB0] bg-[#FFFDF7] text-[#011936] border-y border-r border-[#4C9DB0]/20"
              : "border-white bg-[#141414] text-zinc-200 border-y border-r border-white/10"
          }`}
        >
          “{citation.excerpt}”
        </blockquote>
      </div>
    </div>
  );
};

export default CitationLink;
