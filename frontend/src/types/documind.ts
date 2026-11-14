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
