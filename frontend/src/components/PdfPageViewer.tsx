import React from "react";
import { Citation } from "../types/documind";

interface PdfPageViewerProps {
  pdfUrl: string | null;
  documentName?: string;
  pageCount?: number | null;
  activePage: number | null;
  activeCitation: Citation | null;
  onSelectPage?: (page: number) => void;
  onClose: () => void;
}

export const PdfPageViewer: React.FC<PdfPageViewerProps> = ({
  pdfUrl,
  documentName,
  pageCount,
  activePage,
  activeCitation,
  onSelectPage,
  onClose,
}) => {
  if (!pdfUrl || !activePage) return null;
  const isBlobUrl = pdfUrl.startsWith("blob:");

  return (
    <aside
      aria-label={`PDF viewer opened to page ${activePage}`}
      className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-full flex-col border-l border-slate-800 bg-[#090d16]/95 backdrop-blur-2xl shadow-2xl transition-all duration-300 sm:w-[480px] lg:w-[540px] xl:w-[620px]"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-[#0d131f]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 rounded-full bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5 text-xs font-bold text-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.2)]">
            Page {activePage}
            {pageCount ? ` of ${pageCount}` : ""}
          </span>
          <span className="truncate text-xs font-medium text-slate-300">
            {documentName || "PDF Document"}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-slate-700/60 bg-slate-800/50 p-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 transition-colors"
          title="Close PDF Preview"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Verified citation excerpt highlight banner */}
      {activeCitation && (
        <div className="border-b border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-slate-300 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 font-semibold text-sky-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <span>Verified Grounded Passage (Page {activeCitation.page_number})</span>
          </div>
          <p className="italic text-slate-200 leading-relaxed bg-[#0b101c]/80 p-2.5 rounded-lg border border-slate-800">
            “{activeCitation.excerpt}”
          </p>
        </div>
      )}

      {/* Main Document Content View */}
      <div className="flex-1 overflow-y-auto bg-[#070a10] p-3 sm:p-4">
        {isBlobUrl ? (
          <iframe
            key={`${pdfUrl}#page=${activePage}`}
            src={`${pdfUrl}#page=${activePage}`}
            title={`PDF Document Page ${activePage}`}
            className="h-full w-full rounded-xl border border-slate-800 bg-white shadow-xl"
          />
        ) : (
          <div className="mx-auto flex h-full max-w-lg flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#0e1422] p-5 sm:p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>{documentName || "PDF Document"}</span>
                <span>Page {activePage}</span>
              </div>

              <div className="mt-4 space-y-3.5 text-xs sm:text-sm leading-relaxed text-slate-300">
                <div className="flex items-center gap-2 text-sky-400 text-xs">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Page-Level Grounded Content View</span>
                </div>

                {activeCitation ? (
                  <mark className="block rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 font-normal text-sky-100 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
                    {activeCitation.excerpt}
                  </mark>
                ) : (
                  <p className="text-slate-400">
                    Click any citation pill in the chat to jump directly to the verified passage excerpt on this page.
                  </p>
                )}

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                  When connected to the FastAPI backend or when uploading a local PDF, the native PDF renders directly in this embedded viewer with citation bookmarks.
                </p>
              </div>
            </div>

            {/* Bottom Page Navigation Controls */}
            {onSelectPage && pageCount && pageCount > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-3">
                <button
                  type="button"
                  disabled={activePage <= 1}
                  onClick={() => onSelectPage(activePage - 1)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 transition-colors"
                >
                  ← Prev Page
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  Page {activePage} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={activePage >= pageCount}
                  onClick={() => onSelectPage(activePage + 1)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 transition-colors"
                >
                  Next Page →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default PdfPageViewer;
