import React from "react";
import { Citation } from "../types/documind";

interface PdfPageViewerProps {
  pdfUrl: string | null;
  documentName?: string;
  pageCount?: number | null;
  activePage: number | null;
  activeCitation: Citation | null;
  theme?: "dark" | "light";
  onSelectPage?: (page: number) => void;
  onClose: () => void;
}

export const PdfPageViewer: React.FC<PdfPageViewerProps> = ({
  pdfUrl,
  documentName,
  pageCount,
  activePage,
  activeCitation,
  theme = "dark",
  onSelectPage,
  onClose,
}) => {
  if (!pdfUrl || !activePage) return null;
  const isBlobUrl = pdfUrl.startsWith("blob:");
  const isLight = theme === "light";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed backdrop with smooth fade-in */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Drawer panel with smooth slide-in */}
      <aside
        aria-label={`PDF viewer opened to page ${activePage}`}
        className={`relative z-10 flex h-full w-full max-w-full flex-col border-l backdrop-blur-2xl animate-slide-in-right sm:w-[480px] lg:w-[560px] xl:w-[640px] ${
          isLight
            ? "border-[#4C9DB0]/30 bg-[#FFFDF7]/98 text-[#011936] shadow-[0_0_60px_rgba(76,157,176,0.3)]"
            : "border-white/15 bg-[#0a0a0a]/98 text-white shadow-[0_0_60px_rgba(0,0,0,0.95)]"
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between border-b px-4 py-3 ${
            isLight
              ? "border-[#4C9DB0]/20 bg-[#FFF9E6]"
              : "border-white/10 bg-[#121212]"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`shrink-0 border px-2.5 py-0.5 text-xs font-bold ${
                isLight
                  ? "bg-[#4C9DB0]/15 border-[#4C9DB0]/30 text-[#4C9DB0]"
                  : "bg-white/10 border-white/20 text-white"
              }`}
            >
              Page {activePage}
              {pageCount ? ` of ${pageCount}` : ""}
            </span>
            <span
              className={`truncate text-xs font-medium ${
                isLight ? "text-[#011936]" : "text-zinc-200"
              }`}
            >
              {documentName || "PDF Document"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`btn-tactile shrink-0 border p-1.5 text-xs font-semibold transition-colors ${
              isLight
                ? "border-[#4C9DB0]/30 text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
                : "border-white/20 bg-[#161616] text-zinc-300 hover:text-black hover:bg-white"
            }`}
            title="Close PDF Preview"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Verified citation excerpt highlight banner */}
        {activeCitation && (
          <div
            className={`border-b px-4 py-3 text-xs backdrop-blur-sm animate-fade-in-down ${
              isLight
                ? "border-[#4C9DB0]/20 bg-[#FFEBAF]/50 text-[#011936]"
                : "border-white/10 bg-[#141414] text-zinc-300"
            }`}
          >
            <div
              className={`flex items-center gap-1.5 font-semibold mb-1 ${
                isLight ? "text-[#4C9DB0]" : "text-white"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 animate-ping ${
                  isLight ? "bg-[#4C9DB0]" : "bg-white"
                }`}
              />
              <span>Verified Grounded Passage (Page {activeCitation.page_number})</span>
            </div>
            <p
              className={`italic leading-relaxed p-2.5 border shadow-inner ${
                isLight
                  ? "text-[#011936] bg-[#FFFDF7] border-[#4C9DB0]/30"
                  : "text-zinc-100 bg-[#0e0e0e] border-white/10"
              }`}
            >
              “{activeCitation.excerpt}”
            </p>
          </div>
        )}

        {/* Main Document Content View */}
        <div
          className={`flex-1 overflow-y-auto p-3 sm:p-4 ${
            isLight ? "bg-[#FFF9E6]" : "bg-[#000000]"
          }`}
        >
          {isBlobUrl ? (
            <iframe
              key={`${pdfUrl}#page=${activePage}`}
              src={`${pdfUrl}#page=${activePage}`}
              title={`PDF Document Page ${activePage}`}
              className={`h-full w-full border bg-white shadow-2xl ${
                isLight ? "border-[#4C9DB0]/30" : "border-white/15"
              }`}
            />
          ) : (
            <div
              className={`mx-auto flex h-full max-w-lg flex-col justify-between border p-5 sm:p-6 shadow-2xl transition-all ${
                isLight
                  ? "border-[#4C9DB0]/30 bg-[#FFFDF7]"
                  : "border-white/15 bg-[#121212]"
              }`}
            >
              <div>
                <div
                  className={`flex items-center justify-between border-b pb-3 text-[11px] font-semibold uppercase tracking-wider ${
                    isLight
                      ? "border-[#4C9DB0]/20 text-[#395d6a]"
                      : "border-white/10 text-zinc-400"
                  }`}
                >
                  <span>{documentName || "PDF Document"}</span>
                  <span>Page {activePage}</span>
                </div>

                <div className="mt-4 space-y-3.5 text-xs sm:text-sm leading-relaxed">
                  <div
                    className={`flex items-center gap-2 text-xs font-semibold ${
                      isLight ? "text-[#4C9DB0]" : "text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Page-Level Grounded Content View</span>
                  </div>

                  {activeCitation ? (
                    <mark
                      className={`block border p-3.5 font-normal shadow-lg animate-scale-up ${
                        isLight
                          ? "border-[#4C9DB0]/40 bg-[#FFEBAF] text-[#011936]"
                          : "border-white/30 bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      }`}
                    >
                      {activeCitation.excerpt}
                    </mark>
                  ) : (
                    <p className={isLight ? "text-[#395d6a]" : "text-zinc-400"}>
                      Click any citation pill in the chat to jump directly to the verified passage excerpt on this page.
                    </p>
                  )}

                  <p
                    className={`text-xs pt-2 border-t ${
                      isLight
                        ? "border-[#4C9DB0]/20 text-[#395d6a]"
                        : "border-white/10 text-zinc-500"
                    }`}
                  >
                    When connected to the FastAPI backend or when uploading a local PDF, the native PDF renders directly in this embedded viewer with citation bookmarks.
                  </p>
                </div>
              </div>

              {/* Bottom Page Navigation Controls */}
              {onSelectPage && pageCount && pageCount > 1 && (
                <div
                  className={`mt-6 flex items-center justify-between border-t pt-3 ${
                    isLight ? "border-[#4C9DB0]/20" : "border-white/10"
                  }`}
                >
                  <button
                    type="button"
                    disabled={activePage <= 1}
                    onClick={() => onSelectPage(activePage - 1)}
                    className={`btn-tactile border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 transition-colors ${
                      isLight
                        ? "border-[#4C9DB0]/40 bg-[#FFEBAF] text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
                        : "border-white/20 bg-[#161616] text-white hover:bg-white hover:text-black"
                    }`}
                  >
                    ← Prev Page
                  </button>
                  <span
                    className={`text-xs font-medium ${
                      isLight ? "text-[#395d6a]" : "text-zinc-400"
                    }`}
                  >
                    Page {activePage} of {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={activePage >= pageCount}
                    onClick={() => onSelectPage(activePage + 1)}
                    className={`btn-tactile border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 transition-colors ${
                      isLight
                        ? "border-[#4C9DB0]/40 bg-[#FFEBAF] text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
                        : "border-white/20 bg-[#161616] text-white hover:bg-white hover:text-black"
                    }`}
                  >
                    Next Page →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default PdfPageViewer;
