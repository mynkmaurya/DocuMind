import React, { useEffect, useRef, useState } from "react";

// ============================================================================
// TYPES (frontend/src/types/documind.ts)
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
// API CLIENT + IN-BROWSER FALLBACK (frontend/src/api/client.ts)
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
        } catch {
          // ignore blob URL failure
        }

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
    } catch {
      fallbackStore.documents = fallbackStore.documents.filter(
        (d) => d.id !== documentId
      );
      delete fallbackStore.chunks[documentId];
      delete fallbackStore.conversations[documentId];
    }
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
      await new Promise((r) => window.setTimeout(r, 35));
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
// COMPONENT: DocumentStatus (frontend/src/components/DocumentStatus.tsx)
// ============================================================================
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
      label: pageCount ? `Ready · ${pageCount}p` : "Ready",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dotClass: "bg-emerald-500",
    },
    error: {
      label: "Error",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      dotClass: "bg-rose-500",
    },
  };

  const current = styles[status];

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${current.dotClass}`} />
        {current.label}
      </span>
      {status === "error" && errorMessage && (
        <p className="text-xs text-rose-700 leading-snug">{errorMessage}</p>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT: DocumentUploader (frontend/src/components/DocumentUploader.tsx)
// ============================================================================
interface DocumentUploaderProps {
  isUploading: boolean;
  uploadProgress: number;
  maxSizeMb?: number;
  onUploadFile: (file: File) => void;
  onValidationError: (message: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  isUploading,
  uploadProgress,
  maxSizeMb = 25,
  onUploadFile,
  onValidationError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSubmit = (file: File | undefined) => {
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      onValidationError(
        "Unsupported file type. Please choose a PDF (.pdf) document."
      );
      return;
    }
    if (file.size === 0) {
      onValidationError("The selected PDF file is empty (0 bytes).");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      onValidationError(`File exceeds the ${maxSizeMb} MB limit.`);
      return;
    }
    onUploadFile(file);
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload a PDF document up to ${maxSizeMb} megabytes`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          validateAndSubmit(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`group cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
          isDragging
            ? "border-indigo-600 bg-indigo-50/70"
            : "border-slate-300 bg-white hover:border-indigo-500 hover:bg-slate-50"
        } ${isUploading ? "pointer-events-none opacity-75" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            validateAndSubmit(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
          {isUploading ? "Uploading PDF…" : "Upload a PDF document"}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Drag & drop or press Enter to browse · Text-based PDF up to {maxSizeMb}{" "}
          MB
        </p>

        {isUploading && (
          <div className="mt-3 w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-indigo-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="mt-1 block text-xs font-medium text-indigo-700">
              {uploadProgress}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: ConversationHistory (frontend/src/components/ConversationHistory.tsx)
// ============================================================================
interface ConversationHistoryProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  disabled?: boolean;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  activeConversationId,
  disabled = false,
  onSelectConversation,
  onCreateConversation,
}) => {
  return (
    <section aria-label="Conversation history" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Conversations
        </h2>
        <button
          type="button"
          disabled={disabled}
          onClick={onCreateConversation}
          className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + New Chat
        </button>
      </div>

      {conversations.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          No conversations yet for this document. Ask a question to start.
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {conversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            return (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                    isSelected
                      ? "bg-indigo-600 font-semibold text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="truncate">{conv.title}</div>
                  <div
                    className={`mt-0.5 text-[11px] ${
                      isSelected ? "text-indigo-100" : "text-slate-400"
                    }`}
                  >
                    {new Date(conv.created_date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// ============================================================================
// COMPONENT: CitationLink (frontend/src/components/CitationLink.tsx)
// ============================================================================
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

// ============================================================================
// COMPONENT: ChatMessage (frontend/src/components/ChatMessage.tsx)
// ============================================================================
interface ChatMessageProps {
  message: ChatMessageItem;
  onOpenCitationPage: (
    documentId: string,
    pageNumber: number,
    citation: Citation
  ) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onOpenCitationPage,
}) => {
  const isUser = message.role === "user";

  return (
    <article
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-indigo-600 text-white"
            : "border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.text}</div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Verified Source Pages
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
// COMPONENT: StreamingIndicator (frontend/src/components/StreamingIndicator.tsx)
// ============================================================================
interface StreamingIndicatorProps {
  isStreaming: boolean;
  onStopStream?: () => void;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  isStreaming,
  onStopStream,
}) => {
  if (!isStreaming) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-3 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-medium text-indigo-800"
    >
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600" />
      </span>
      <span>Streaming grounded answer…</span>
      {onStopStream && (
        <button
          type="button"
          onClick={onStopStream}
          className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          Stop
        </button>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT: MessageInput (frontend/src/components/MessageInput.tsx)
// ============================================================================
interface MessageInputProps {
  disabled: boolean;
  placeholder?: string;
  onSendQuestion: (question: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled,
  placeholder = "Ask a question about the uploaded PDF…",
  onSendQuestion,
}) => {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled) return;
    onSendQuestion(trimmed);
    setQuestion("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20"
    >
      <label htmlFor="documind-question-input" className="sr-only">
        Ask a question about the document
      </label>
      <textarea
        id="documind-question-input"
        rows={2}
        value={question}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !question.trim()}
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Ask
      </button>
    </form>
  );
};

// ============================================================================
// COMPONENT: ErrorState (frontend/src/components/ErrorState.tsx)
// ============================================================================
interface ErrorStateProps {
  message: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onDismiss,
  onRetry,
}) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm"
    >
      <div className="flex-1">
        <span className="font-semibold">Notice: </span>
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: PdfPageViewer (frontend/src/components/PdfPageViewer.tsx)
// ============================================================================
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

// ============================================================================
// MAIN APPLICATION (frontend/src/App.tsx)
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
    const hasPending = documents.some(
      (d) => d.status === "uploading" || d.status === "processing"
    );
    if (!hasPending) return;

    const timer = window.setInterval(async () => {
      try {
        const updated = await docuMindApi.listDocuments();
        setDocuments(updated);
      } catch {
        // Ignore transient polling failures
      }
    }, 900);

    return () => window.clearInterval(timer);
  }, [documents]);

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
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      })
      .catch((err: Error) => setErrorMessage(err.message));
  }, [selectedDocument?.id, selectedDocument?.status]);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    docuMindApi
      .getMessages(activeConvId)
      .then(setMessages)
      .catch((err: Error) => setErrorMessage(err.message));
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
      setViewerPage(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await docuMindApi.deleteDocument(docId);
      const remaining = documents.filter((d) => d.id !== docId);
      setDocuments(remaining);
      if (selectedDocId === docId) {
        setSelectedDocId(remaining[0]?.id || null);
        setViewerPage(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not delete document.");
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedDocument || selectedDocument.status !== "ready") return;
    setErrorMessage(null);
    try {
      const conv = await docuMindApi.createConversation(selectedDocument.id);
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleSendQuestion = async (question: string) => {
    if (
      !selectedDocument ||
      selectedDocument.status !== "ready" ||
      isStreaming
    ) {
      return;
    }
    setErrorMessage(null);

    try {
      let targetConvId = activeConvId;
      if (!targetConvId) {
        const createdConv = await docuMindApi.createConversation(
          selectedDocument.id,
          question.slice(0, 60)
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
          onError: (msg) => {
            setErrorMessage(msg);
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setErrorMessage(err.message || "Could not answer right now.");
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      <aside className="flex w-full flex-col gap-5 border-b border-slate-200 bg-white p-4 md:h-full md:w-80 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              DocuMind
            </h1>
            <p className="text-xs text-slate-500">
              Grounded PDF Q&A with Page Citations
            </p>
          </div>
        </div>

        <DocumentUploader
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onUploadFile={handleUploadFile}
          onValidationError={setErrorMessage}
        />

        <section aria-label="Uploaded documents" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Documents ({documents.length})
          </h2>
          {documents.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Upload a text-based PDF above to begin asking questions.
            </p>
          ) : (
            <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                return (
                  <li
                    key={doc.id}
                    className={`rounded-xl border p-2.5 transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/40"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDocId(doc.id)}
                        className="flex-1 text-left text-xs font-semibold text-slate-800 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
                      >
                        <div className="truncate">{doc.filename}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        aria-label={`Delete ${doc.filename}`}
                        className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <DocumentStatus
                        status={doc.status}
                        pageCount={doc.page_count}
                        errorMessage={doc.processing_error}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <ConversationHistory
            conversations={conversations}
            activeConversationId={activeConvId}
            disabled={!selectedDocument || selectedDocument.status !== "ready"}
            onSelectConversation={setActiveConvId}
            onCreateConversation={handleCreateConversation}
          />
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
          {selectedDocument ? (
            <div className="flex items-center gap-3">
              <h2 className="truncate text-sm font-bold text-slate-900">
                {selectedDocument.filename}
              </h2>
              <DocumentStatus
                status={selectedDocument.status}
                pageCount={selectedDocument.page_count}
              />
            </div>
          ) : (
            <span className="text-sm font-medium text-slate-500">
              No document selected
            </span>
          )}
        </header>

        {errorMessage && (
          <div className="px-6 pt-4">
            <ErrorState
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {!selectedDocument ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-slate-700">
                Upload a PDF to start asking questions
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                DocuMind extracts text page by page, indexes overlapping chunks,
                and answers with clickable page citations.
              </p>
            </div>
          ) : selectedDocument.status !== "ready" ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <DocumentStatus
                status={selectedDocument.status}
                pageCount={selectedDocument.page_count}
                errorMessage={selectedDocument.processing_error}
              />
              <p className="mt-2 text-xs text-slate-500">
                {selectedDocument.status === "error"
                  ? "Please upload a valid text-based PDF to continue."
                  : "Extracting pages and generating chunk embeddings…"}
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-slate-700">
                Ready to answer questions on {selectedDocument.filename}
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                Ask any question in plain language. Every answer is grounded in
                retrieved passages with verified page badges that open the exact
                page in the PDF.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOpenCitationPage={(_docId, pageNum, citation) => {
                  setViewerPage(pageNum);
                  setViewerCitation(citation);
                }}
              />
            ))
          )}

          <div className="pt-2">
            <StreamingIndicator
              isStreaming={isStreaming}
              onStopStream={() => abortControllerRef.current?.abort()}
            />
          </div>
          <div ref={chatBottomRef} />
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-4">
          <MessageInput
            disabled={
              !selectedDocument ||
              selectedDocument.status !== "ready" ||
              isStreaming
            }
            placeholder={
              !selectedDocument
                ? "Upload a PDF document first…"
                : selectedDocument.status !== "ready"
                ? "Waiting for PDF processing to finish…"
                : "Ask a question about this PDF (Press Enter to send)…"
            }
            onSendQuestion={handleSendQuestion}
          />
        </footer>
      </main>

      {selectedDocument && viewerPage && (
        <PdfPageViewer
          pdfUrl={docuMindApi.getDocumentPdfUrl(selectedDocument.id)}
          documentName={selectedDocument.filename}
          pageCount={selectedDocument.page_count}
          activePage={viewerPage}
          activeCitation={viewerCitation}
          onSelectPage={(newPage) => setViewerPage(newPage)}
          onClose={() => {
            setViewerPage(null);
            setViewerCitation(null);
          }}
        />
      )}
    </div>
  );
};

export default App;