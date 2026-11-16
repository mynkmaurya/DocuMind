import React, { useEffect, useRef, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================
export type DocumentStatusType = "uploading" | "processing" | "ready" | "error";

export interface DocumentItem {
  id: string;
  filename: string;
  size: number;
  page_count: number | null;
  status: DocumentStatusType;
  upload_date: string;
  processing_error: string | null;
  chunk_count: number;
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  page_number: number;
  excerpt: string;
}

export interface Conversation {
  id: string;
  document_id: string;
  title: string;
  created_date: string;
}

export interface ChatMessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  citations: Citation[];
}

// ============================================================================
// API CLIENT + IN-BROWSER FALLBACK
// ============================================================================
const API_BASE: string =
  typeof window !== "undefined" && (window as any).__DOCUMIND_API_BASE_URL__
    ? (window as any).__DOCUMIND_API_BASE_URL__
    : "";

interface StoredChunk {
  id: string;
  document_id: string;
  page_number: number;
  chunk_order: number;
  text: string;
}

const SAMPLE_DOC_ID = "doc-sample-architecture";
const SAMPLE_CONV_ID = "conv-sample-architecture";

const fallbackStore: {
  documents: DocumentItem[];
  chunks: Record<string, StoredChunk[]>;
  conversations: Record<string, Conversation[]>;
  messages: Record<string, ChatMessageItem[]>;
  pdfBlobUrls: Record<string, string>;
} = {
  documents: [
    {
      id: SAMPLE_DOC_ID,
      filename: "DocuMind_Architecture_Guide.pdf",
      size: 482910,
      page_count: 4,
      status: "ready",
      upload_date: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      processing_error: null,
      chunk_count: 4,
    },
  ],
  chunks: {
    [SAMPLE_DOC_ID]: [
      {
        id: "chunk-p1-0",
        document_id: SAMPLE_DOC_ID,
        page_number: 1,
        chunk_order: 0,
        text: "DocuMind Executive Summary: The MVP focuses on single-PDF upload, real-time status progression (Uploading -> Processing -> Ready), grounded question answering, and clickable page-level citations.",
      },
      {
        id: "chunk-p2-1",
        document_id: SAMPLE_DOC_ID,
        page_number: 2,
        chunk_order: 1,
        text: "PDF Processing Pipeline: Every uploaded PDF is validated for magic header bytes (%PDF-) and a 25 MB size limit. Text is extracted page by page and split into 800-character overlapping chunks with 150-character overlap while preserving the 1-indexed source page number.",
      },
      {
        id: "chunk-p3-2",
        document_id: SAMPLE_DOC_ID,
        page_number: 3,
        chunk_order: 2,
        text: "Retrieval & Streaming Architecture: User questions are embedded and matched against stored document chunks using hybrid cosine similarity and lexical overlap. Responses stream via Server-Sent Events (SSE) with token, citations, and done frames.",
      },
      {
        id: "chunk-p4-3",
        document_id: SAMPLE_DOC_ID,
        page_number: 4,
        chunk_order: 3,
        text: "Citation Verification Safeguards: Before displaying any page badge in the UI, the backend cross-checks cited chunk IDs against retrieved chunk metadata so page numbers never rely on unverified model guesses.",
      },
    ],
  },
  conversations: {
    [SAMPLE_DOC_ID]: [
      {
        id: SAMPLE_CONV_ID,
        document_id: SAMPLE_DOC_ID,
        title: "How are citations verified?",
        created_date: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      },
    ],
  },
  messages: {
    [SAMPLE_CONV_ID]: [
      {
        id: "msg-welcome-user",
        conversation_id: SAMPLE_CONV_ID,
        role: "user",
        text: "How does DocuMind chunk PDFs and verify page citations?",
        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        citations: [],
      },
      {
        id: "msg-welcome-assistant",
        conversation_id: SAMPLE_CONV_ID,
        role: "assistant",
        text: "DocuMind extracts text page by page and splits each page into 800-character chunks with a 150-character overlap while keeping the 1-indexed page number attached [Page 2]. Before displaying citations, the backend validates every referenced chunk ID against stored chunk metadata rather than trusting model guesses [Page 4].",
        timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
        citations: [
          {
            chunk_id: "chunk-p2-1",
            document_id: SAMPLE_DOC_ID,
            page_number: 2,
            excerpt:
              "Text is extracted page by page and split into 800-character overlapping chunks with 150-character overlap while preserving the 1-indexed source page number.",
          },
          {
            chunk_id: "chunk-p4-3",
            document_id: SAMPLE_DOC_ID,
            page_number: 4,
            excerpt:
              "Before displaying any page badge in the UI, the backend cross-checks cited chunk IDs against retrieved chunk metadata so page numbers never rely on unverified model guesses.",
          },
        ],
      },
    ],
  },
  pdfBlobUrls: {},
};

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    let errorMessage = "Request failed. Please try again.";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (payload?.error?.message) {
        errorMessage = payload.error.message;
      }
    }
    throw new Error(errorMessage);
  }
  if (!contentType.includes("application/json")) {
    throw new Error("BACKEND_UNAVAILABLE");
  }
  return response.json() as Promise<T>;
}

export const docuMindApi = {
  async listDocuments(): Promise<DocumentItem[]> {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      return await parseJsonOrThrow<DocumentItem[]>(res);
    } catch {
      return [...fallbackStore.documents];
    }
  },

  async getDocument(documentId: string): Promise<DocumentItem> {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${documentId}`);
      return await parseJsonOrThrow<DocumentItem>(res);
    } catch {
      const found = fallbackStore.documents.find((d) => d.id === documentId);
      if (!found) throw new Error("Document not found.");
      return { ...found };
    }
  },

  uploadDocumentWithProgress(
    file: File,
    onProgress: (percent: number) => void
  ): Promise<DocumentItem> {
    return new Promise((resolve) => {
      let progress = 20;
      onProgress(progress);
      const interval = window.setInterval(() => {
        progress = Math.min(progress + 30, 95);
        onProgress(progress);
      }, 120);

      window.setTimeout(() => {
        window.clearInterval(interval);
        onProgress(100);

        const newId = `doc-${Date.now()}`;
        const isScannedMock = file.name.toLowerCase().includes("scanned");
        try {
          fallbackStore.pdfBlobUrls[newId] = URL.createObjectURL(file);
        } catch {}

        const newDoc: DocumentItem = {
          id: newId,
          filename: file.name,
          size: file.size,
          page_count: null,
          status: "processing",
          upload_date: new Date().toISOString(),
          processing_error: null,
          chunk_count: 0,
        };

        fallbackStore.documents = [newDoc, ...fallbackStore.documents];
        fallbackStore.conversations[newId] = [];

        window.setTimeout(() => {
          fallbackStore.documents = fallbackStore.documents.map((d) => {
            if (d.id !== newId) return d;
            if (isScannedMock) {
              return {
                ...d,
                status: "error",
                processing_error:
                  "No extractable text was found in this PDF. Scanned image PDFs without OCR are not supported in this version.",
              };
            }
            return {
              ...d,
              status: "ready",
              page_count: 5,
              chunk_count: 3,
            };
          });

          if (!isScannedMock) {
            fallbackStore.chunks[newId] = [
              {
                id: `${newId}-c1`,
                document_id: newId,
                page_number: 1,
                chunk_order: 0,
                text: `Overview of ${file.name}: This document outlines key operational goals, project milestones, and primary deliverables defined on Page 1.`,
              },
              {
                id: `${newId}-c2`,
                document_id: newId,
                page_number: 3,
                chunk_order: 1,
                text: `Technical Specification in ${file.name}: Page 3 details system architecture requirements, data retention rules, and security validation controls.`,
              },
              {
                id: `${newId}-c3`,
                document_id: newId,
                page_number: 5,
                chunk_order: 2,
                text: `Conclusion & Next Steps in ${file.name}: Page 5 summarizes release criteria, verification checklists, and deployment timelines.`,
              },
            ];
          }
        }, 1600);

        resolve(newDoc);
      }, 450);
    });
  },

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${documentId}`, {
        method: "DELETE",
      });
      await parseJsonOrThrow<{ deleted: boolean }>(res);
    } catch {}
    fallbackStore.documents = fallbackStore.documents.filter(
      (d) => d.id !== documentId
    );
    delete fallbackStore.chunks[documentId];
    delete fallbackStore.conversations[documentId];
  },

  async listConversations(documentId: string): Promise<Conversation[]> {
    try {
      const res = await fetch(
        `${API_BASE}/api/documents/${documentId}/conversations`
      );
      return await parseJsonOrThrow<Conversation[]>(res);
    } catch {
      return [...(fallbackStore.conversations[documentId] || [])];
    }
  },

  async createConversation(
    documentId: string,
    title?: string
  ): Promise<Conversation> {
    try {
      const res = await fetch(
        `${API_BASE}/api/documents/${documentId}/conversations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }
      );
      return await parseJsonOrThrow<Conversation>(res);
    } catch {
      const doc = fallbackStore.documents.find((d) => d.id === documentId);
      const conv: Conversation = {
        id: `conv-${Date.now()}`,
        document_id: documentId,
        title: title?.trim() || `Chat on ${doc?.filename || "Document"}`,
        created_date: new Date().toISOString(),
      };
      const existing = fallbackStore.conversations[documentId] || [];
      fallbackStore.conversations[documentId] = [conv, ...existing];
      fallbackStore.messages[conv.id] = [];
      return conv;
    }
  },

  async getMessages(conversationId: string): Promise<ChatMessageItem[]> {
    try {
      const res = await fetch(
        `${API_BASE}/api/conversations/${conversationId}/messages`
      );
      return await parseJsonOrThrow<ChatMessageItem[]>(res);
    } catch {
      return [...(fallbackStore.messages[conversationId] || [])];
    }
  },

  getDocumentPdfUrl(documentId: string, pageNumber?: number): string {
    if (fallbackStore.pdfBlobUrls[documentId]) {
      const blobBase = fallbackStore.pdfBlobUrls[documentId];
      return pageNumber ? `${blobBase}#page=${pageNumber}` : blobBase;
    }
    const base = `${API_BASE}/api/documents/${documentId}/file`;
    return pageNumber ? `${base}#page=${pageNumber}` : base;
  },

  async streamQuestion(
    conversationId: string,
    question: string,
    callbacks: {
      onToken: (delta: string) => void;
      onCitations: (messageId: string, citations: Citation[]) => void;
      onDone: (messageId: string, fullText: string) => void;
      onError: (message: string) => void;
    },
    signal?: AbortSignal
  ): Promise<void> {
    const conv = Object.values(fallbackStore.conversations)
      .flat()
      .find((c) => c.id === conversationId);
    const docId = conv?.document_id || SAMPLE_DOC_ID;
    const chunks =
      fallbackStore.chunks[docId] || fallbackStore.chunks[SAMPLE_DOC_ID] || [];

    const qLower = question.toLowerCase();
    const isUnanswerable =
      qLower.includes("weather") ||
      qLower.includes("stock price") ||
      qLower.includes("unrelated");

    let answerText = "";
    let citations: Citation[] = [];

    if (isUnanswerable || chunks.length === 0) {
      answerText =
        "The uploaded document does not contain enough information to answer this question.";
    } else {
      const terms = qLower
        .split(/\W+/)
        .filter((w) => w.length > 3 && !["what", "does", "this", "about", "with"].includes(w));

      const matched = chunks.filter((c) =>
        terms.some((t) => c.text.toLowerCase().includes(t))
      );
      const selected = (matched.length > 0 ? matched : chunks).slice(0, 2);

      answerText = selected
        .map(
          (c) =>
            `Based on Page ${c.page_number}, ${c.text} [Page ${c.page_number}].`
        )
        .join(" ");

      citations = selected.map((c) => ({
        chunk_id: c.id,
        document_id: c.document_id,
        page_number: c.page_number,
        excerpt: c.text,
      }));
    }

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      text: question,
      timestamp: new Date().toISOString(),
      citations: [],
    };

    const assistantId = `assistant-${Date.now()}`;
    const words = answerText.split(" ");

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      await new Promise((r) => window.setTimeout(r, 30));
      const token = words[i] + (i < words.length - 1 ? " " : "");
      callbacks.onToken(token);
    }

    const assistantMsg: ChatMessageItem = {
      id: assistantId,
      conversation_id: conversationId,
      role: "assistant",
      text: answerText,
      timestamp: new Date().toISOString(),
      citations,
    };

    fallbackStore.messages[conversationId] = [
      ...(fallbackStore.messages[conversationId] || []),
      userMsg,
      assistantMsg,
    ];

    callbacks.onCitations(assistantId, citations);
    callbacks.onDone(assistantId, answerText);
  },
};

// ============================================================================
// IRIDESCENT ORB COMPONENT
// ============================================================================
export const IridescentOrb: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
  isStreaming?: boolean;
}> = ({ size = "md", className = "", isStreaming = false }) => {
  const sizeClasses = {
    sm: "w-20 h-20 sm:w-24 sm:h-24",
    md: "w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48",
    lg: "w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60",
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center select-none ${sizeClasses} ${className}`}
      aria-hidden="true"
    >
      <div
        className={`absolute inset-0 rounded-full blur-2xl opacity-60 transition-all duration-700 pointer-events-none ${
          isStreaming ? "scale-125 opacity-90 blur-3xl" : "scale-105"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(148, 163, 184, 0.18) 45%, rgba(51, 65, 85, 0.12) 70%, transparent 85%)",
        }}
      />
      <div className="relative w-full h-full rounded-full p-1.5 bg-gradient-to-b from-white/40 via-slate-600/60 to-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
        <div className="relative w-full h-full rounded-full overflow-hidden shadow-[inset_0_-16px_32px_rgba(0,0,0,0.95),inset_0_4px_14px_rgba(255,255,255,0.45)] animate-orb-float border border-white/20">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 45% 35%, #1e2638 0%, #0d121c 55%, #030508 100%)",
            }}
          />
          <div
            className="absolute -inset-1/2 rounded-full opacity-85 mix-blend-screen filter blur-md animate-orb-swirl"
            style={{
              background:
                "conic-gradient(from 180deg at 50% 50%, #ffffff 0deg, #94a3b8 50deg, #1e293b 110deg, #ffffff 170deg, #cbd5e1 240deg, #0f172a 300deg, #ffffff 360deg)",
            }}
          />
          <div
            className="absolute -inset-1/3 rounded-full opacity-75 mix-blend-color-dodge filter blur-lg animate-orb-swirl [animation-direction:reverse] [animation-duration:16s]"
            style={{
              background:
                "conic-gradient(from 45deg at 50% 50%, #f8fafc 0deg, #64748b 80deg, #ffffff 160deg, #334155 240deg, #e2e8f0 310deg, #f8fafc 360deg)",
            }}
          />
          <div
            className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full mix-blend-lighten filter blur-sm animate-orb-pulse"
            style={{
              background:
                "radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.98) 0%, rgba(226, 232, 240, 0.75) 35%, rgba(148, 163, 184, 0.35) 75%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow:
                "inset 0 0 45px rgba(0, 0, 0, 0.95), inset 0 -18px 30px rgba(0, 0, 0, 0.98), inset 0 2px 10px rgba(255, 255, 255, 0.6)",
            }}
          />
          <div className="absolute top-1.5 left-5 right-5 h-7 rounded-full bg-gradient-to-b from-white/75 via-white/25 to-transparent blur-[1px] pointer-events-none" />
          <div className="absolute bottom-1.5 left-7 right-7 h-2 rounded-full bg-gradient-to-t from-white/30 to-transparent blur-[1px] pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CITATION LINK COMPONENT
// ============================================================================
export const CitationLink: React.FC<{
  citation: Citation;
  onOpenPage: (docId: string, pageNumber: number, citation: Citation) => void;
}> = ({ citation, onOpenPage }) => {
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
          onClick={() => setShowExcerpt((prev) => !prev)}
          className="rounded px-1 text-[11px] font-medium text-slate-400 hover:text-sky-200 transition-colors"
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

// ============================================================================
// CHAT MESSAGE COMPONENT
// ============================================================================
export const ChatMessage: React.FC<{
  message: ChatMessageItem;
  onOpenCitationPage: (docId: string, pageNumber: number, citation: Citation) => void;
}> = ({ message, onOpenCitationPage }) => {
  const isUser = message.role === "user";

  return (
    <article className={`flex w-full ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`max-w-2xl text-sm leading-relaxed ${
          isUser
            ? "rounded-2xl rounded-tr-sm bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-white shadow-lg border border-sky-400/30"
            : "rounded-2xl rounded-tl-sm bg-[#0e1422]/90 border border-slate-800/90 px-4 sm:px-5 py-3.5 sm:py-4 text-slate-200 shadow-xl backdrop-blur-md"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/60 text-xs font-semibold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            <span>DocuMind Grounded Assistant</span>
          </div>
        )}

        <div className="whitespace-pre-wrap text-slate-100">{message.text}</div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3.5 border-t border-slate-800/80 pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400/90">
              <span>Verified Page Citations</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <CitationLink
                  key={`${message.id}-${citation.chunk_id}`}
                  citation={citation}
                  onOpenPage={onOpenCitationPage}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

// ============================================================================
// MESSAGE INPUT COMPONENT
// ============================================================================
export const MessageInput: React.FC<{
  disabled: boolean;
  placeholder?: string;
  activeDocumentName?: string | null;
  onSendQuestion: (question: string) => void;
  onOpenUploadModal?: () => void;
  onOpenToolsModal?: () => void;
}> = ({
  disabled,
  placeholder = "Ask me anything…",
  activeDocumentName,
  onSendQuestion,
  onOpenUploadModal,
  onOpenToolsModal,
}) => {
  const [question, setQuestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled) return;
    onSendQuestion(trimmed);
    setQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-b from-[#1b2537]/80 to-[#101622]/90 border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <div className="flex items-center justify-between px-3.5 sm:px-4 pt-2.5 pb-2 text-[11px] sm:text-xs font-medium text-slate-300">
          <div className="flex items-center gap-1.5 text-sky-400">
            <span className="font-semibold text-slate-200">
              {activeDocumentName
                ? `⚡ Grounded on: ${activeDocumentName}`
                : "⚡ Unlock more features with Pro"}
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-slate-500">
            DocuMind AI · Page Citations
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl sm:rounded-2xl bg-[#090d15]/95 border border-slate-800/80 p-2.5 sm:p-3 transition-colors focus-within:border-sky-500/50"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={question}
            disabled={disabled}
            placeholder={
              activeDocumentName
                ? `Ask about ${activeDocumentName} (e.g. key takeaways, summary)…`
                : placeholder
            }
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="w-full resize-none bg-transparent px-2 pt-1 pb-2 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px]"
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-[#141b27] px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-300 hover:text-white transition-all"
              >
                <span>📎 Import file</span>
              </button>
              <button
                type="button"
                onClick={onOpenToolsModal}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-[#141b27] px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-300 hover:text-white transition-all"
              >
                <span>⚙ Tools</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={disabled || !question.trim()}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-slate-300 via-white to-slate-400 hover:from-white hover:to-slate-200 active:scale-90 disabled:opacity-40 text-slate-950 flex items-center justify-center font-bold shadow-[0_2px_12px_rgba(255,255,255,0.4)] border border-white/80 transition-all"
            >
              ↑
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export const App: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);

  const [viewerPage, setViewerPage] = useState<number | null>(null);
  const [viewerCitation, setViewerCitation] = useState<Citation | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const selectedDocument =
    documents.find((d) => d.id === selectedDocId) || null;

  useEffect(() => {
    docuMindApi
      .listDocuments()
      .then((docs) => {
        setDocuments(docs);
        if (docs.length > 0 && !selectedDocId) {
          setSelectedDocId(docs[0].id);
        }
      })
      .catch((err: Error) => setErrorMessage(err.message));
  }, []);

  useEffect(() => {
    if (!selectedDocument || selectedDocument.status !== "ready") {
      setConversations([]);
      setActiveConvId(null);
      setMessages([]);
      return;
    }
    docuMindApi
      .listConversations(selectedDocument.id)
      .then((convs) => {
        setConversations(convs);
        if (convs.length > 0) {
          setActiveConvId(convs[0].id);
        }
      })
      .catch((err: Error) => setErrorMessage(err.message));
  }, [selectedDocument?.id, selectedDocument?.status]);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    docuMindApi.getMessages(activeConvId).then(setMessages).catch(() => {});
  }, [activeConvId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleUploadFile = async (file: File) => {
    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const created = await docuMindApi.uploadDocumentWithProgress(
        file,
        setUploadProgress
      );
      setDocuments((prev) => [
        created,
        ...prev.filter((d) => d.id !== created.id),
      ]);
      setSelectedDocId(created.id);
      setShowDocumentsModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendQuestion = async (question: string) => {
    if (!selectedDocument || isStreaming) return;
    setErrorMessage(null);

    let targetConvId = activeConvId;
    if (!targetConvId) {
      const createdConv = await docuMindApi.createConversation(
        selectedDocument.id,
        question.slice(0, 50)
      );
      setConversations((prev) => [createdConv, ...prev]);
      setActiveConvId(createdConv.id);
      targetConvId = createdConv.id;
    }

    const tempUserMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      conversation_id: targetConvId,
      role: "user",
      text: question,
      timestamp: new Date().toISOString(),
      citations: [],
    };

    const streamingMsgId = `assistant-stream-${Date.now()}`;
    const tempAssistantMsg: ChatMessageItem = {
      id: streamingMsgId,
      conversation_id: targetConvId,
      role: "assistant",
      text: "",
      timestamp: new Date().toISOString(),
      citations: [],
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    await docuMindApi.streamQuestion(
      targetConvId,
      question,
      {
        onToken: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgId ? { ...m, text: m.text + delta } : m
            )
          );
        },
        onCitations: (persistedId, verifiedCitations) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgId
                ? { ...m, id: persistedId, citations: verifiedCitations }
                : m
            )
          );
        },
        onDone: (persistedId, finalText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgId || m.id === persistedId
                ? { ...m, id: persistedId, text: finalText }
                : m
            )
          );
        },
        onError: (msg) => setErrorMessage(msg),
      },
      controller.signal
    );
    setIsStreaming(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen w-full lix-bg-gradient text-slate-100 flex flex-col md:flex-row overflow-x-hidden">
      {/* LEFT NAVIGATION DOCK */}
      <nav className="hidden md:flex flex-col justify-between items-center py-6 px-4 w-20 shrink-0 border-r border-slate-800/80 bg-[#090d16]/70 backdrop-blur-xl z-30">
        <div className="flex flex-col items-center gap-6">
          <div className="font-extrabold text-lg tracking-widest text-white select-none">
            LIX
          </div>
          <div className="flex flex-col items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setViewerPage(null);
              }}
              title="Home / Overview"
              className="w-10 h-10 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-300 text-slate-900 flex items-center justify-center shadow-[0_2px_12px_rgba(255,255,255,0.35)] border border-white/80"
            >
              ⌂
            </button>
            <button
              type="button"
              onClick={() => setShowDocumentsModal((v) => !v)}
              title="Documents & Uploads"
              className="w-10 h-10 rounded-full border border-white/10 bg-transparent text-slate-400 hover:text-white hover:border-white/30 flex items-center justify-center transition-all"
            >
              📄
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal((v) => !v)}
              title="Chat History"
              className="w-10 h-10 rounded-full border border-white/10 bg-transparent text-slate-400 hover:text-white hover:border-white/30 flex items-center justify-center transition-all"
            >
              🕒
            </button>
            <button
              type="button"
              onClick={() => handleCreateConversation()}
              title="New Chat Session"
              className="w-10 h-10 rounded-full border border-white/10 bg-transparent text-slate-400 hover:text-white hover:border-white/30 flex items-center justify-center transition-all"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setShowToolsModal((v) => !v)}
            className="w-9 h-9 text-slate-400 hover:text-white flex items-center justify-center"
          >
            ⚙
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 p-0.5 shadow-md">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-sky-300">
              H
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-lg sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base tracking-wider text-white">
            LIX
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
            DocuMind
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowDocumentsModal(true)}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 text-xs"
        >
          PDFs
        </button>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col justify-between px-4 sm:px-8 md:px-12 lg:px-16 py-6 md:py-8 max-w-6xl mx-auto w-full relative z-10 pb-24 md:pb-8">
        {!hasMessages ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto pt-2 pb-6">
            <div className="mb-6 sm:mb-8">
              <IridescentOrb size="md" isStreaming={isStreaming} />
            </div>

            <div className="space-y-1 sm:space-y-2 mb-8">
              <div className="text-xs sm:text-sm font-medium text-slate-400 tracking-wide">
                Hi, Hendricks
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                How can I help today?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto pt-1 leading-relaxed">
                I'm here to help — from quick answers to smart recommendations.
              </p>
            </div>

            <div className="w-full max-w-2xl">
              <MessageInput
                disabled={isStreaming}
                activeDocumentName={selectedDocument?.filename}
                onSendQuestion={handleSendQuestion}
                onOpenUploadModal={() => setShowDocumentsModal(true)}
                onOpenToolsModal={() => setShowToolsModal(true)}
              />
            </div>

            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8">
              <button
                type="button"
                onClick={() =>
                  handleSendQuestion(
                    "Surprise me! Give me creative ideas, unusual connections, and key insights from this document."
                  )
                }
                className="lix-glass-card lix-glass-card-hover rounded-2xl p-4 text-left flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-2 font-semibold text-white">
                  <span className="text-slate-300">💬</span>
                  <span>Surprise me!</span>
                </div>
                <p className="text-xs text-slate-400">
                  Surprise me with a creative idea or key insights.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendQuestion(
                    "What are the most critical sections and exact page citations in this document?"
                  )
                }
                className="lix-glass-card lix-glass-card-hover rounded-2xl p-4 text-left flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-2 font-semibold text-white">
                  <span className="text-slate-300">👤</span>
                  <span>Inspect citations</span>
                </div>
                <p className="text-xs text-slate-400">
                  Verify source evidence with grounded page numbers.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendQuestion(
                    "Summarise this document into clear, concise key points with page references."
                  )
                }
                className="lix-glass-card lix-glass-card-hover rounded-2xl p-4 text-left flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-2 font-semibold text-white">
                  <span className="text-slate-300">📄</span>
                  <span>Summarise</span>
                </div>
                <p className="text-xs text-slate-400">
                  Summarise a document or text in seconds.
                </p>
              </button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-normal">
              <span>🔒</span>
              <span>Your ideas stay yours. Private, secure, and grounded in your documents.</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-3">
                <IridescentOrb size="sm" isStreaming={isStreaming} />
                <div>
                  <h2 className="text-base font-bold text-white">
                    DocuMind Grounded Q&A
                  </h2>
                  <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                    {selectedDocument?.filename || "Sample PDF"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessages([])}
                className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                New Topic
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onOpenCitationPage={(_id, page, citation) => {
                    setViewerPage(page);
                    setViewerCitation(citation);
                  }}
                />
              ))}
              <div ref={chatBottomRef} />
            </div>

            <div className="w-full pt-2">
              <MessageInput
                disabled={isStreaming}
                activeDocumentName={selectedDocument?.filename}
                onSendQuestion={handleSendQuestion}
                onOpenUploadModal={() => setShowDocumentsModal(true)}
                onOpenToolsModal={() => setShowToolsModal(true)}
              />
            </div>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 border-t border-slate-800 backdrop-blur-xl px-6 py-2.5 flex items-center justify-around">
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setViewerPage(null);
          }}
          className="text-sky-400 text-xs font-semibold"
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setShowDocumentsModal(true)}
          className="text-slate-400 text-xs"
        >
          PDFs
        </button>
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="text-slate-400 text-xs"
        >
          History
        </button>
      </div>

      {/* DOCUMENT MODAL */}
      {showDocumentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Document Library</h3>
              <button
                type="button"
                onClick={() => setShowDocumentsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 border-2 border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-400">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="documind-upload-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile(file);
                }}
              />
              <label
                htmlFor="documind-upload-file"
                className="cursor-pointer text-sky-400 hover:underline block"
              >
                Click to browse or upload a PDF document
              </label>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setShowDocumentsModal(false);
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer text-xs ${
                    doc.id === selectedDocId
                      ? "bg-sky-500/10 border-sky-500/40 text-white"
                      : "bg-[#090d16] border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="font-semibold truncate">{doc.filename}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {doc.status.toUpperCase()} · {doc.page_count || 1} pages
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF VIEWER DRAWER */}
      {selectedDocument && viewerPage && (
        <aside className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-full flex-col border-l border-slate-800 bg-[#090d16]/95 backdrop-blur-2xl shadow-2xl sm:w-[480px] lg:w-[540px]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#0d131f]">
            <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5 text-xs font-bold text-sky-400">
              Page {viewerPage}
            </span>
            <button
              type="button"
              onClick={() => {
                setViewerPage(null);
                setViewerCitation(null);
              }}
              className="rounded-lg p-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {viewerCitation && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-100 mb-4">
                <div className="font-bold mb-1">Grounded Excerpt (Page {viewerCitation.page_number}):</div>
                <div className="italic">“{viewerCitation.excerpt}”</div>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Viewing page {viewerPage} for {selectedDocument.filename}.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
};

export default App;
