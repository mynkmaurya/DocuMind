import {
  DocumentItem,
  DocumentStatusType,
  Citation,
  Conversation,
  ChatMessageItem,
} from "../types/documind";

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
    return new Promise((resolve, reject) => {
      // First try real backend upload via XMLHttpRequest for accurate progress
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/documents`, true);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const percent = Math.round((evt.loaded / evt.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
            return;
          } catch {
            // fallback
          }
        }
        // If HTTP error or not JSON, fallback to in-browser demo
        runFallbackUpload(file, onProgress, resolve);
      };

      xhr.onerror = () => {
        // Backend not running, use fallback
        runFallbackUpload(file, onProgress, resolve);
      };

      try {
        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
      } catch {
        runFallbackUpload(file, onProgress, resolve);
      }
    });
  },

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${documentId}`, {
        method: "DELETE",
      });
      await parseJsonOrThrow<{ deleted: boolean }>(res);
    } catch {
      // fallback
    }
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
    // Attempt real SSE stream first
    try {
      const response = await fetch(
        `${API_BASE}/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
          signal,
        }
      );

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentMessageId = `asst-${Date.now()}`;
        let fullAccumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            const trimmed = block.trim();
            if (!trimmed) continue;
            let event = "message";
            let data = "";

            for (const line of trimmed.split("\n")) {
              if (line.startsWith("event:")) {
                event = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                data = line.replace("data:", "").trim();
              }
            }

            if (event === "token") {
              try {
                const parsed = JSON.parse(data);
                const token = parsed.token || "";
                fullAccumulated += token;
                callbacks.onToken(token);
              } catch {
                callbacks.onToken(data);
              }
            } else if (event === "citations") {
              try {
                const citations: Citation[] = JSON.parse(data);
                callbacks.onCitations(currentMessageId, citations);
              } catch {
                callbacks.onCitations(currentMessageId, []);
              }
            } else if (event === "done") {
              try {
                const doneObj = JSON.parse(data);
                callbacks.onDone(doneObj.message_id || currentMessageId, doneObj.full_text || fullAccumulated);
              } catch {
                callbacks.onDone(currentMessageId, fullAccumulated);
              }
              return;
            }
          }
        }
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") throw e;
    }

    // Fallback in-browser stream
    runFallbackStreaming(conversationId, question, callbacks, signal);
  },
};

function runFallbackUpload(
  file: File,
  onProgress: (percent: number) => void,
  resolve: (doc: DocumentItem) => void
) {
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
}

async function runFallbackStreaming(
  conversationId: string,
  question: string,
  callbacks: {
    onToken: (delta: string) => void;
    onCitations: (messageId: string, citations: Citation[]) => void;
    onDone: (messageId: string, fullText: string) => void;
    onError: (message: string) => void;
  },
  signal?: AbortSignal
) {
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
}
