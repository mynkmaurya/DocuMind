import React, { useEffect, useRef, useState } from "react";
import {
  DocumentItem,
  Citation,
  Conversation,
  ChatMessageItem,
} from "./types/documind";
import { docuMindApi } from "./api/client";
import { IridescentOrb } from "./components/IridescentOrb";
import { MessageInput } from "./components/MessageInput";
import { ChatMessage } from "./components/ChatMessage";
import { StreamingIndicator } from "./components/StreamingIndicator";
import { ErrorState } from "./components/ErrorState";
import { DocumentStatus } from "./components/DocumentStatus";
import { DocumentUploader } from "./components/DocumentUploader";
import { PdfPageViewer } from "./components/PdfPageViewer";

export const App: React.FC = () => {
  // Core Data States
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);

  // UI Interactive States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);

  // PDF Viewer Drawer
  const [viewerPage, setViewerPage] = useState<number | null>(null);
  const [viewerCitation, setViewerCitation] = useState<Citation | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const selectedDocument =
    documents.find((d) => d.id === selectedDocId) || null;

  // 1. Initial Load of Documents
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

  // 2. Poll for pending processing documents
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

  // 3. Load conversations when selected document changes
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

  // 4. Load messages when active conversation changes
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

  // 5. Smooth auto scroll chat on update
  useEffect(() => {
    if (messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Handle PDF upload
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
      setShowDocumentsModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Document Delete
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

  // Handle Create Conversation
  const handleCreateConversation = async () => {
    if (!selectedDocument || selectedDocument.status !== "ready") return;
    setErrorMessage(null);
    try {
      const conv = await docuMindApi.createConversation(selectedDocument.id);
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setShowHistoryModal(false);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Handle Send Question
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

  const handleCitationOpen = (
    _docId: string,
    pageNumber: number,
    citation: Citation
  ) => {
    setViewerPage(pageNumber);
    setViewerCitation(citation);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen w-full lix-bg-gradient text-slate-100 flex flex-col md:flex-row overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* ==================================================================== */}
      {/* LEFT NAVIGATION DOCK (Desktop: Vertical Bar | Mobile: Bottom Nav)    */}
      {/* ==================================================================== */}
      <nav
        aria-label="Navigation dock"
        className="hidden md:flex flex-col justify-between items-center py-6 px-4 w-20 shrink-0 border-r border-slate-800/80 bg-[#090d16]/70 backdrop-blur-xl z-30 transition-all duration-300"
      >
        {/* Brand Logo & Top Controls */}
        <div className="flex flex-col items-center gap-6">
          <div className="font-extrabold text-lg tracking-widest text-white select-none hover:text-sky-400 transition-colors cursor-pointer">
            LIX
          </div>

          <div className="flex flex-col items-center gap-3.5">
            {/* Active Home / Main Tab */}
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setViewerPage(null);
              }}
              title="Home / Overview"
              className="btn-tactile w-10 h-10 rounded-2xl bg-[#0098ea] hover:bg-[#0089d4] text-white flex items-center justify-center shadow-[0_0_18px_rgba(0,152,234,0.45)]"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </button>

            {/* Document Manager Button */}
            <button
              type="button"
              onClick={() => setShowDocumentsModal((v) => !v)}
              title="Documents & Uploads"
              className={`btn-tactile w-10 h-10 rounded-2xl flex items-center justify-center ${
                showDocumentsModal
                  ? "bg-slate-700/80 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>

            {/* Conversation History Button */}
            <button
              type="button"
              onClick={() => setShowHistoryModal((v) => !v)}
              title="Chat History"
              className={`btn-tactile w-10 h-10 rounded-2xl flex items-center justify-center ${
                showHistoryModal
                  ? "bg-slate-700/80 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleCreateConversation}
              title="Start New Chat"
              className="btn-tactile w-10 h-10 rounded-2xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Profile & Settings */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setShowToolsModal((v) => !v)}
            title="Settings"
            className="btn-tactile w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* User Profile Avatar */}
          <div
            title="Logged in as Hendricks / Mayank"
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 p-0.5 shadow-md select-none cursor-pointer btn-tactile"
          >
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-sky-300">
              H
            </div>
          </div>
        </div>
      </nav>

      {/* ==================================================================== */}
      {/* MOBILE TOP BAR (Phone Header)                                         */}
      {/* ==================================================================== */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-lg sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base tracking-wider text-white">
            LIX
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
            DocuMind
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDocumentsModal((v) => !v)}
            className="btn-tactile p-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 text-xs flex items-center gap-1"
          >
            <span>PDFs</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={handleCreateConversation}
            className="btn-tactile p-1.5 rounded-lg bg-[#0098ea] text-white text-xs font-semibold shadow-[0_0_10px_rgba(0,152,234,0.4)]"
          >
            + New
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN VIEWPORT / STAGE                                                 */}
      {/* ==================================================================== */}
      <main className="flex-1 flex flex-col justify-between px-4 sm:px-8 md:px-12 lg:px-16 py-6 md:py-8 max-w-6xl mx-auto w-full relative z-10 pb-24 md:pb-8">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="w-full max-w-2xl mx-auto mb-4 animate-fade-in-down">
            <ErrorState
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          </div>
        )}

        {/* HERO SECTION: Visible when no conversation has started */}
        {!hasMessages ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto pt-2 pb-6 animate-fade-in-up">
            {/* The Stunning 3D Iridescent Orb */}
            <div className="mb-6 sm:mb-8">
              <IridescentOrb
                size="md"
                isStreaming={isStreaming}
                onClick={() => {
                  handleSendQuestion(
                    "Hello! What is this document about and what questions can I ask?"
                  );
                }}
              />
            </div>

            {/* Greeting Typography matching the screenshot */}
            <div className="space-y-1 sm:space-y-2 mb-8 animate-fade-in-up stagger-1">
              <div className="text-xs sm:text-sm font-medium text-slate-400 tracking-wide">
                Hi, Hendricks
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
                How can I help today?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto pt-1 leading-relaxed">
                I'm here to help — from quick answers to smart recommendations.
              </p>
            </div>

            {/* Central Prompter Box */}
            <div className="w-full max-w-2xl animate-fade-in-up stagger-2">
              <MessageInput
                disabled={isStreaming}
                activeDocumentName={selectedDocument?.filename}
                onSendQuestion={handleSendQuestion}
                onOpenUploadModal={() => setShowDocumentsModal(true)}
                onOpenToolsModal={() => setShowToolsModal(true)}
              />
            </div>

            {/* Quick Action Cards Grid (Bottom) matching the screenshot */}
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 animate-fade-in-up stagger-3">
              {/* Card 1: Surprise me! */}
              <button
                type="button"
                onClick={() =>
                  handleSendQuestion(
                    "Surprise me! Give me key takeaways and unique insights from this document."
                  )
                }
                className="lix-glass-card lix-glass-card-hover rounded-2xl p-4 text-left flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base text-slate-200 group-hover:scale-110 transition-transform">💬</span>
                  <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                    Surprise me!
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Surprise me with a creative idea or key insights.
                </p>
              </button>

              {/* Card 2: Inspect Citations */}
              <button
                type="button"
                onClick={() =>
                  handleSendQuestion(
                    "What are the most critical sections and exact page citations in this document?"
                  )
                }
                className="lix-glass-card lix-glass-card-hover rounded-2xl p-4 text-left flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base text-slate-200 group-hover:scale-110 transition-transform">👤</span>
                  <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                    Inspect citations
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verify source evidence with grounded page numbers.
                </p>
              </button>

              {/* Card 3: Summarise */}
              <button
                type="button"
                onClick={() =>
                  handleSendQuestion(
                    "Summarise this document into clear, concise key points with page references."
                  )
                }
                className="lix-glass-card lix-glass-card-hover rounded-2xl p-4 text-left flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base text-slate-200 group-hover:scale-110 transition-transform">📑</span>
                  <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                    Summarise
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Summarise a document or text in seconds.
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* CHAT CONVERSATION VIEW (Active Stream & Messages)               */
          /* ================================================================ */
          <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto animate-fade-in-up">
            {/* Top Compact Brand & Document Status Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-3">
                <IridescentOrb size="sm" isStreaming={isStreaming} />
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>DocuMind Grounded Q&A</span>
                  </h2>
                  <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                    {selectedDocument?.filename || "Sample PDF Guide"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="btn-tactile rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  New Topic
                </button>
              </div>
            </div>

            {/* Chat Messages Stream List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scroll-smooth">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onOpenCitationPage={handleCitationOpen}
                />
              ))}

              {isStreaming && (
                <div className="py-2">
                  <StreamingIndicator
                    isStreaming={isStreaming}
                    onStopStream={() => abortControllerRef.current?.abort()}
                  />
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Bottom Persistent Input Box */}
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

      {/* ==================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< 768px Phones)                        */}
      {/* ==================================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 border-t border-slate-800 backdrop-blur-xl px-6 py-2.5 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setViewerPage(null);
          }}
          className="btn-tactile flex flex-col items-center gap-1 text-sky-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setShowDocumentsModal(true)}
          className="btn-tactile flex flex-col items-center gap-1 text-slate-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[10px] font-medium">PDFs</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="btn-tactile flex flex-col items-center gap-1 text-slate-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-medium">History</span>
        </button>

        <button
          type="button"
          onClick={() => setShowToolsModal(true)}
          className="btn-tactile flex flex-col items-center gap-1 text-slate-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          <span className="text-[10px] font-medium">Tools</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* DOCUMENT MANAGEMENT MODAL / DRAWER                                   */}
      {/* ==================================================================== */}
      {showDocumentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in-down">
          <div className="w-full max-w-lg rounded-3xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Document Library
                </h3>
                <p className="text-xs text-slate-400">
                  Select a document to ask questions or upload new PDFs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDocumentsModal(false)}
                className="btn-tactile p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <DocumentUploader
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onUploadFile={handleUploadFile}
              onValidationError={setErrorMessage}
            />

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Uploaded PDFs ({documents.length})
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? "bg-sky-500/10 border-sky-500/40 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                          : "bg-[#090d16] border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setViewerPage(null);
                          setShowDocumentsModal(false);
                        }}
                        className="btn-tactile flex-1 text-left min-w-0"
                      >
                        <div className="text-xs font-semibold truncate">
                          {doc.filename}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <DocumentStatus
                            status={doc.status}
                            pageCount={doc.page_count}
                            errorMessage={doc.processing_error}
                          />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="btn-tactile ml-3 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                        title="Delete Document"
                      >
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONVERSATION HISTORY MODAL / DRAWER                                  */}
      {/* ==================================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in-down">
          <div className="w-full max-w-md rounded-3xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Chat History</h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="btn-tactile p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">
                  No conversation threads for this document yet.
                </p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setShowHistoryModal(false);
                    }}
                    className={`btn-tactile w-full text-left p-3 rounded-2xl border text-xs transition-all ${
                      conv.id === activeConvId
                        ? "bg-sky-500 text-white font-semibold shadow-lg"
                        : "bg-[#090d16] border-slate-800 text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="truncate">{conv.title}</div>
                    <div className="mt-1 text-[10px] opacity-70">
                      {new Date(conv.created_date).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TOOLS & SETTINGS MODAL                                               */}
      {/* ==================================================================== */}
      {showToolsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in-down">
          <div className="w-full max-w-md rounded-3xl bg-[#0d131f] border border-slate-800 p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                RAG Engine Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowToolsModal(false)}
                className="btn-tactile p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#090d16] border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Citation Strictness</div>
                  <div className="text-[11px] text-slate-500">
                    Verify against stored chunk metadata
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#090d16] border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Offline Fallback</div>
                  <div className="text-[11px] text-slate-500">
                    Deterministic local n-gram vectors
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                  Auto
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#090d16] border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Chunking Window</div>
                  <div className="text-[11px] text-slate-500">
                    800 chars / 150 overlap (Sentence-snapped)
                  </div>
                </div>
                <span className="text-slate-400 font-mono">800/150</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SIDE-BY-SIDE / MOBILE DRAWER PDF PAGE VIEWER                         */}
      {/* ==================================================================== */}
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
