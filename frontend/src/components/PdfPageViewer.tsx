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
      className="flex h-full w-full flex-col border-l border-slate-200 bg-white lg:w-[440px] xl:w-[500px]"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
            Page {activePage}
            {pageCount ? ` of ${pageCount}` : ""}
          </span>
          <span className="truncate text-xs font-medium text-slate-600">
            {documentName || "Source PDF Inspection"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          Close PDF
        </button>
      </div>

      {activeCitation && (
        <div className="border-b border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-slate-700">
          <div className="font-semibold text-indigo-950">
            Verified Chunk Excerpt (Chunk ID: {activeCitation.chunk_id})
          </div>
          <p className="mt-1 italic text-slate-800">
            “{activeCitation.excerpt}”
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
        {isBlobUrl ? (
          <iframe
            key={`${pdfUrl}#page=${activePage}`}
            src={`${pdfUrl}#page=${activePage}`}
            title={`PDF Document Page ${activePage}`}
            className="h-full w-full rounded-lg border border-slate-200 bg-white shadow-sm"
          />
        ) : (
          <div className="mx-auto flex h-full max-w-md flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>{documentName || "PDF Document"}</span>
                <span>Page {activePage}</span>
              </div>
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600">
                <p className="text-slate-400">
                  [Extracted Page {activePage} Content View]
                </p>
                {activeCitation ? (
                  <mark className="block rounded-lg border border-amber-200 bg-amber-50/90 p-3 font-medium text-slate-900 not-italic">
                    {activeCitation.excerpt}
                  </mark>
                ) : (
                  <p>
                    Select a citation badge in the chat panel to highlight the
                    grounded passage on this page.
                  </p>
                )}
                <p className="text-slate-400">
                  When connected to the FastAPI backend (`GET
                  /api/documents/:id/file#page={activePage}`) or when you upload
                  a local PDF file, the native PDF page renders directly in this
                  frame.
                </p>
              </div>
            </div>

            {onSelectPage && pageCount && pageCount > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={activePage <= 1}
                  onClick={() => onSelectPage(activePage - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  ← Prev Page
                </button>
                <span className="text-xs text-slate-500">
                  Page {activePage} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={activePage >= pageCount}
                  onClick={() => onSelectPage(activePage + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
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
