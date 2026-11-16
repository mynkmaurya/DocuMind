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

  // Theme State ("dark" = Matte Black & White (No Blue), "light" = Moonstone #4C9DB0 & Vanilla #FFEBAF)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("documind-theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("documind-theme", next);
      }
      return next;
    });
  };

  const isLight = theme === "light";

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
    <div
      className={`min-h-screen w-full flex items-center justify-center p-0 md:p-4 lg:p-6 overflow-x-hidden transition-colors duration-300 ${
        isLight
          ? "theme-light-canvas text-[#011936] selection:bg-[#4C9DB0] selection:text-white"
          : "theme-dark-canvas text-white selection:bg-white selection:text-black"
      }`}
    >
      {/* Outer App Frame (Straight brutalist geometry matching request) */}
      <div
        className={`w-full h-full min-h-screen md:min-h-[92vh] max-w-[1440px] border flex flex-col md:flex-row overflow-hidden relative backdrop-blur-2xl transition-colors duration-300 ${
          isLight
            ? "bg-[#FFEBAF]/90 border-[#4C9DB0]/40 shadow-[0_30px_90px_rgba(76,157,176,0.2)]"
            : "bg-[#0c0c0c]/95 border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
        }`}
      >
        {/* ==================================================================== */}
        {/* LEFT NAVIGATION DOCK (Straight Lines & Theme Accents)                */}
        {/* ==================================================================== */}
        <nav
          aria-label="Navigation dock"
          className={`hidden md:flex flex-col justify-between items-center py-7 px-3.5 w-[76px] shrink-0 border-r backdrop-blur-2xl z-30 transition-colors duration-300 ${
            isLight
              ? "bg-[#FFF5D6]/90 border-[#4C9DB0]/20"
              : "bg-[#0e0e0e]/95 border-white/15"
          }`}
        >
          {/* Top Brand Logo & Navigation Controls */}
          <div className="flex flex-col items-center gap-6 w-full">
            {/* LIX Brand Logo */}
            <div
              onClick={() => {
                setMessages([]);
                setViewerPage(null);
              }}
              className={`font-extrabold text-base tracking-widest select-none cursor-pointer pt-1 transition-colors ${
                isLight
                  ? "text-[#011936] hover:text-[#4C9DB0]"
                  : "text-white hover:text-zinc-300"
              }`}
            >
              LIX
            </div>

            <div className="flex flex-col items-center gap-3.5 w-full">
              {/* Active Home Button: Straight Square */}
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setViewerPage(null);
                }}
                title="Home / Overview"
                className={`btn-tactile w-10 h-10 border flex items-center justify-center transition-all ${
                  isLight
                    ? "bg-[#4C9DB0] hover:bg-[#387c8c] text-white border-[#4C9DB0] shadow-[0_0_15px_rgba(76,157,176,0.5)]"
                    : "bg-white hover:bg-zinc-200 text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                }`}
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </button>

              {/* Document Manager Button: Straight Square */}
              <button
                type="button"
                onClick={() => setShowDocumentsModal((v) => !v)}
                title="Documents & Uploads"
                className={`btn-tactile w-10 h-10 border flex items-center justify-center transition-all ${
                  showDocumentsModal
                    ? isLight
                      ? "border-[#4C9DB0] bg-[#4C9DB0] text-white"
                      : "border-white bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    : isLight
                    ? "border-[#4C9DB0]/30 bg-[#FFFDF5] text-[#011936] hover:border-[#4C9DB0] hover:bg-[#4C9DB0] hover:text-white"
                    : "border-white/15 bg-[#141414] text-zinc-300 hover:border-white hover:bg-white hover:text-black"
                }`}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>

              {/* History / Clock Icon Button: Straight Square */}
              <button
                type="button"
                onClick={() => setShowHistoryModal((v) => !v)}
                title="Chat History"
                className={`btn-tactile w-10 h-10 border flex items-center justify-center transition-all ${
                  showHistoryModal
                    ? isLight
                      ? "border-[#4C9DB0] bg-[#4C9DB0] text-white"
                      : "border-white bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    : isLight
                    ? "border-[#4C9DB0]/30 bg-[#FFFDF5] text-[#011936] hover:border-[#4C9DB0] hover:bg-[#4C9DB0] hover:text-white"
                    : "border-white/15 bg-[#141414] text-zinc-300 hover:border-white hover:bg-white hover:text-black"
                }`}
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* New Chat Button: Straight Square */}
              <button
                type="button"
                onClick={handleCreateConversation}
                title="New Chat Session"
                className={`btn-tactile w-10 h-10 border flex items-center justify-center transition-all ${
                  isLight
                    ? "border-[#4C9DB0]/30 bg-[#FFFDF5] text-[#011936] hover:border-[#4C9DB0] hover:bg-[#4C9DB0] hover:text-white"
                    : "border-white/15 bg-[#141414] text-zinc-300 hover:border-white hover:bg-white hover:text-black"
                }`}
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom Profile & Settings */}
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Settings Gear */}
            <button
              type="button"
              onClick={() => setShowToolsModal((v) => !v)}
              title="Settings & RAG Tools"
              className={`btn-tactile w-9 h-9 border flex items-center justify-center transition-colors ${
                isLight
                  ? "border-[#4C9DB0]/30 text-[#011936] hover:border-[#4C9DB0] hover:bg-[#4C9DB0] hover:text-white"
                  : "border-white/15 bg-[#141414] text-zinc-300 hover:border-white hover:bg-white hover:text-black"
              }`}
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

            {/* Functional Theme Toggle Button (Light/Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={
                isLight
                  ? "Switch to Dark Mode (Matte Black & White)"
                  : "Switch to Light Mode (Moonstone & Vanilla)"
              }
              className={`btn-tactile w-9 h-9 border flex items-center justify-center transition-all ${
                isLight
                  ? "border-[#4C9DB0] bg-[#4C9DB0] text-white shadow-[0_0_12px_rgba(76,157,176,0.6)]"
                  : "border-white/30 bg-white/10 text-white hover:bg-white hover:text-black shadow-[0_0_12px_rgba(255,255,255,0.2)]"
              }`}
            >
              {isLight ? (
                /* Sun Icon */
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="5" />
                  <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                /* Moon Icon */
                <svg
                  className="w-4 h-4 fill-none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* User Profile Avatar with Straight Square Frame */}
            <div
              title="Logged in as Hendricks"
              className={`w-9 h-9 border shadow-md select-none cursor-pointer btn-tactile overflow-hidden flex items-center justify-center font-bold text-xs ${
                isLight
                  ? "border-[#4C9DB0] bg-[#FFF8E6] text-[#4C9DB0]"
                  : "border-white/30 bg-[#161616] text-white hover:border-white"
              }`}
            >
              H
            </div>
          </div>
        </nav>

        {/* ==================================================================== */}
        {/* MAIN VIEWPORT / STAGE                                                 */}
        {/* ==================================================================== */}
        <div className="flex-1 flex flex-col justify-between min-h-screen md:min-h-0 relative overflow-y-auto">
          {/* Top Header Bar */}
          <header
            className={`w-full flex items-center justify-between px-5 sm:px-8 md:px-10 py-5 text-xs z-20 border-b ${
              isLight
                ? "border-[#4C9DB0]/20 text-[#011936]"
                : "border-white/10 text-zinc-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`font-extrabold tracking-widest text-sm md:hidden ${
                  isLight ? "text-[#011936]" : "text-white"
                }`}
              >
                LIX
              </span>
              <span
                className={`font-semibold tracking-tight text-sm ${
                  isLight ? "text-[#011936]" : "text-white"
                }`}
              >
                DocuMind
              </span>
              <span
                className={`border px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                  isLight
                    ? "border-[#4C9DB0] bg-[#4C9DB0]/15 text-[#4C9DB0]"
                    : "border-white/30 bg-white/10 text-white"
                }`}
              >
                BETA
              </span>
            </div>

            <div
              onClick={() => setShowDocumentsModal(true)}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer select-none px-3 py-1 border ${
                isLight
                  ? "border-[#4C9DB0]/30 bg-[#FFFDF7] text-[#011936] hover:border-[#4C9DB0]"
                  : "border-white/15 bg-[#141414] text-zinc-200 hover:text-white hover:border-white"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 ${
                  isLight ? "bg-[#4C9DB0]" : "bg-white"
                }`}
              />
              <span className="font-medium">Personal workspace</span>
              <span className="text-[10px]">▾</span>
            </div>
          </header>

          {/* Main Center Stage */}
          <main className="flex-1 flex flex-col justify-between px-4 sm:px-8 md:px-12 lg:px-16 py-4 max-w-5xl mx-auto w-full relative z-10 pb-20 md:pb-6">
            {/* Error Notification Banner */}
            {errorMessage && (
              <div className="w-full max-w-2xl mx-auto mb-4 animate-fade-in-down">
                <ErrorState
                  message={errorMessage}
                  onDismiss={() => setErrorMessage(null)}
                />
              </div>
            )}

            {/* HERO VIEW */}
            {!hasMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center my-auto pt-1 pb-4 animate-fade-in-up">
                {/* The Iridescent Nebula Orb (Explicitly exempt from straight edges) */}
                <div className="mb-6 sm:mb-7">
                  <IridescentOrb
                    size="md"
                    theme={theme}
                    isStreaming={isStreaming}
                    onClick={() => {
                      handleSendQuestion(
                        "Hello! What is this document about and what questions can I ask?"
                      );
                    }}
                  />
                </div>

                {/* Greeting Typography */}
                <div className="space-y-1.5 mb-7 animate-fade-in-up stagger-1">
                  <div
                    className={`text-xs sm:text-sm font-medium tracking-wide ${
                      isLight ? "text-[#4C9DB0] font-semibold" : "text-zinc-400 font-medium"
                    }`}
                  >
                    Hi, Hendricks
                  </div>
                  <h1
                    className={`text-3xl sm:text-4xl md:text-[42px] font-bold tracking-tight drop-shadow-sm ${
                      isLight ? "text-[#011936]" : "text-white"
                    }`}
                  >
                    How can I help today?
                  </h1>
                  <p
                    className={`text-xs sm:text-sm max-w-md mx-auto pt-0.5 leading-relaxed ${
                      isLight ? "text-[#2e4d58]" : "text-zinc-400"
                    }`}
                  >
                    I'm here to help — from quick answers to smart recommendations.
                  </p>
                </div>

                {/* Central Floating Prompt Box */}
                <div className="w-full max-w-2xl animate-fade-in-up stagger-2">
                  <MessageInput
                    disabled={isStreaming}
                    theme={theme}
                    activeDocumentName={selectedDocument?.filename}
                    onSendQuestion={handleSendQuestion}
                    onOpenUploadModal={() => setShowDocumentsModal(true)}
                    onOpenToolsModal={() => setShowToolsModal(true)}
                  />
                </div>

                {/* Quick Action Cards Grid (Bottom) - Straight Brutalist Rectangles */}
                <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-7 animate-fade-in-up stagger-3">
                  {/* Card 1: Surprise me! */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSendQuestion(
                        "Surprise me! Give me creative ideas, unusual connections, and key insights from this document."
                      )
                    }
                    className={`p-4 text-left flex flex-col justify-between group cursor-pointer border ${
                      isLight ? "card-light" : "card-dark"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-sm ${
                          isLight ? "text-[#4C9DB0]" : "text-white"
                        }`}
                      >
                        💬
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold transition-colors ${
                          isLight
                            ? "text-[#011936] group-hover:text-[#4C9DB0]"
                            : "text-white group-hover:text-zinc-200"
                        }`}
                      >
                        Surprise me!
                      </span>
                    </div>
                    <p
                      className={`text-[11px] sm:text-xs leading-relaxed ${
                        isLight ? "text-[#395d6a]" : "text-zinc-400"
                      }`}
                    >
                      Surprise me with a creative idea or key insights.
                    </p>
                  </button>

                  {/* Card 2: Inspect citations */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSendQuestion(
                        "What are the most critical sections and exact page citations in this document?"
                      )
                    }
                    className={`p-4 text-left flex flex-col justify-between group cursor-pointer border ${
                      isLight ? "card-light" : "card-dark"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-sm ${
                          isLight ? "text-[#4C9DB0]" : "text-white"
                        }`}
                      >
                        👤
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold transition-colors ${
                          isLight
                            ? "text-[#011936] group-hover:text-[#4C9DB0]"
                            : "text-white group-hover:text-zinc-200"
                        }`}
                      >
                        Inspect citations
                      </span>
                    </div>
                    <p
                      className={`text-[11px] sm:text-xs leading-relaxed ${
                        isLight ? "text-[#395d6a]" : "text-zinc-400"
                      }`}
                    >
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
                    className={`p-4 text-left flex flex-col justify-between group cursor-pointer border ${
                      isLight ? "card-light" : "card-dark"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-sm ${
                          isLight ? "text-[#4C9DB0]" : "text-white"
                        }`}
                      >
                        📄
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold transition-colors ${
                          isLight
                            ? "text-[#011936] group-hover:text-[#4C9DB0]"
                            : "text-white group-hover:text-zinc-200"
                        }`}
                      >
                        Summarise
                      </span>
                    </div>
                    <p
                      className={`text-[11px] sm:text-xs leading-relaxed ${
                        isLight ? "text-[#395d6a]" : "text-zinc-400"
                      }`}
                    >
                      Summarise a document or text in seconds.
                    </p>
                  </button>
                </div>

                {/* Bottom Security / Privacy Footer */}
                <div
                  className={`mt-8 flex items-center justify-center gap-1.5 text-[11px] font-normal ${
                    isLight ? "text-[#4C9DB0]" : "text-zinc-500"
                  }`}
                >
                  <span>🔒</span>
                  <span>
                    Your ideas stay yours. Private, secure, and grounded in your
                    documents.
                  </span>
                </div>
              </div>
            ) : (
            /* ============================================================== */
            /* CHAT CONVERSATION STREAM VIEW                                  */
            /* ============================================================== */
            <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto animate-fade-in-up">
              {/* Header inside chat */}
              <div
                className={`flex items-center justify-between pb-4 border-b mb-4 ${
                  isLight ? "border-[#4C9DB0]/20" : "border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <IridescentOrb size="sm" isStreaming={isStreaming} theme={theme} />
                  <div>
                    <h2
                      className={`text-base font-bold flex items-center gap-2 ${
                        isLight ? "text-[#011936]" : "text-white"
                      }`}
                    >
                      <span>DocuMind Grounded Q&A</span>
                    </h2>
                    <p
                      className={`text-xs truncate max-w-xs sm:max-w-md ${
                        isLight ? "text-[#395d6a]" : "text-zinc-400"
                      }`}
                    >
                      {selectedDocument?.filename || "Sample PDF Guide"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMessages([])}
                    className={`btn-tactile border px-3 py-1.5 text-xs transition-colors ${
                      isLight
                        ? "border-[#4C9DB0]/30 bg-[#FFFDF7] text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
                        : "border-white/20 bg-[#161616] text-zinc-300 hover:text-black hover:bg-white"
                    }`}
                  >
                    New Topic
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scroll-smooth">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    theme={theme}
                    onOpenCitationPage={handleCitationOpen}
                  />
                ))}

                {isStreaming && (
                  <div className="py-2">
                    <StreamingIndicator
                      isStreaming={isStreaming}
                      theme={theme}
                      onStopStream={() => abortControllerRef.current?.abort()}
                    />
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Input Box */}
              <div className="w-full pt-2">
                <MessageInput
                  disabled={isStreaming}
                  theme={theme}
                  activeDocumentName={selectedDocument?.filename}
                  onSendQuestion={handleSendQuestion}
                  onOpenUploadModal={() => setShowDocumentsModal(true)}
                  onOpenToolsModal={() => setShowToolsModal(true)}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Close Desktop Frame Container */}
      </div>

      {/* ==================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< 768px Phones & Tablets)             */}
      {/* ==================================================================== */}
      <div
        className={`md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 border px-4 py-2 flex items-center gap-4 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-colors duration-300 ${
          isLight
            ? "bg-[#FFF5D6]/95 border-[#4C9DB0]/40 text-[#011936]"
            : "bg-[#0e0e0e]/95 border-white/20 text-white"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            setViewerPage(null);
          }}
          className={`btn-tactile w-8 h-8 border flex items-center justify-center ${
            isLight
              ? "bg-[#4C9DB0] text-white border-[#4C9DB0]"
              : "bg-white text-black border-white"
          }`}
          title="Home"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setShowDocumentsModal(true)}
          className={`btn-tactile p-2 border ${
            isLight
              ? "border-[#4C9DB0]/20 text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
              : "border-white/10 text-zinc-300 hover:text-white hover:border-white hover:bg-white/10"
          }`}
          title="PDF Documents"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleCreateConversation}
          className={`btn-tactile p-2 border ${
            isLight
              ? "border-[#4C9DB0]/20 text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
              : "border-white/10 text-zinc-300 hover:text-white hover:border-white hover:bg-white/10"
          }`}
          title="New Chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className={`btn-tactile p-2 border ${
            isLight
              ? "border-[#4C9DB0]/20 text-[#011936] hover:bg-[#4C9DB0] hover:text-white"
              : "border-white/10 text-zinc-300 hover:text-white hover:border-white hover:bg-white/10"
          }`}
          title="Chat History"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className={`btn-tactile p-2 border ${
            isLight
              ? "border-[#4C9DB0] bg-[#4C9DB0] text-white"
              : "border-white/30 bg-white/10 text-white hover:bg-white hover:text-black"
          }`}
          title={isLight ? "Dark Mode" : "Light Mode"}
        >
          {isLight ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-4 h-4 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* DOCUMENT MANAGEMENT MODAL                                            */}
      {/* ==================================================================== */}
      {showDocumentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in-down">
          <div
            className={`w-full max-w-lg border p-6 shadow-2xl space-y-5 animate-scale-up ${
              isLight
                ? "bg-[#FFFDF7] border-[#4C9DB0] text-[#011936]"
                : "bg-[#0e0e0e] border-white/20 text-white"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isLight ? "border-[#4C9DB0]/20" : "border-white/10"
              }`}
            >
              <div>
                <h3
                  className={`text-base font-bold ${
                    isLight ? "text-[#011936]" : "text-white"
                  }`}
                >
                  Document Library
                </h3>
                <p
                  className={`text-xs ${
                    isLight ? "text-[#395d6a]" : "text-zinc-400"
                  }`}
                >
                  Select a document to ask questions or upload new PDFs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDocumentsModal(false)}
                className={`btn-tactile p-1.5 ${
                  isLight
                    ? "text-[#011936] hover:text-[#4C9DB0]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                ✕
              </button>
            </div>

            <DocumentUploader
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              theme={theme}
              onUploadFile={handleUploadFile}
              onValidationError={setErrorMessage}
            />

            <div className="space-y-2">
              <h4
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isLight ? "text-[#4C9DB0]" : "text-zinc-400"
                }`}
              >
                Uploaded PDFs ({documents.length})
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-3 border transition-all duration-200 ${
                        isSelected
                          ? isLight
                            ? "bg-[#4C9DB0]/15 border-[#4C9DB0] text-[#011936] font-semibold"
                            : "bg-white/15 border-white text-white font-semibold"
                          : isLight
                          ? "bg-[#FFF9E6] border-[#4C9DB0]/20 text-[#011936] hover:border-[#4C9DB0]"
                          : "bg-[#141414] border-white/10 text-zinc-200 hover:border-white/40"
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
                            theme={theme}
                          />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className={`btn-tactile ml-3 p-1.5 transition-colors ${
                          isLight
                            ? "text-slate-400 hover:text-rose-600"
                            : "text-zinc-500 hover:text-white"
                        }`}
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
      {/* CONVERSATION HISTORY MODAL                                           */}
      {/* ==================================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in-down">
          <div
            className={`w-full max-w-md border p-6 shadow-2xl space-y-4 animate-scale-up ${
              isLight
                ? "bg-[#FFFDF7] border-[#4C9DB0] text-[#011936]"
                : "bg-[#0e0e0e] border-white/20 text-white"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isLight ? "border-[#4C9DB0]/20" : "border-white/10"
              }`}
            >
              <h3
                className={`text-base font-bold ${
                  isLight ? "text-[#011936]" : "text-white"
                }`}
              >
                Chat History
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className={`btn-tactile p-1 ${
                  isLight
                    ? "text-[#011936] hover:text-[#4C9DB0]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <p
                  className={`text-xs p-4 text-center ${
                    isLight ? "text-[#395d6a]" : "text-zinc-400"
                  }`}
                >
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
                    className={`btn-tactile w-full text-left p-3 border text-xs transition-all ${
                      conv.id === activeConvId
                        ? isLight
                          ? "bg-[#4C9DB0]/20 border-[#4C9DB0] text-[#011936] font-semibold"
                          : "bg-white/15 border-white text-white font-semibold"
                        : isLight
                        ? "bg-[#FFF9E6] border-[#4C9DB0]/20 text-[#011936] hover:border-[#4C9DB0]"
                        : "bg-[#141414] border-white/10 text-zinc-300 hover:border-white/30"
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
          <div
            className={`w-full max-w-md border p-6 shadow-2xl space-y-4 animate-scale-up ${
              isLight
                ? "bg-[#FFFDF7] border-[#4C9DB0] text-[#011936]"
                : "bg-[#0e0e0e] border-white/20 text-white"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isLight ? "border-[#4C9DB0]/20" : "border-white/10"
              }`}
            >
              <h3
                className={`text-base font-bold ${
                  isLight ? "text-[#011936]" : "text-white"
                }`}
              >
                RAG Engine Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowToolsModal(false)}
                className={`btn-tactile p-1 ${
                  isLight
                    ? "text-[#011936] hover:text-[#4C9DB0]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                ✕
              </button>
            </div>

            <div
              className={`space-y-3 text-xs ${
                isLight ? "text-[#011936]" : "text-zinc-300"
              }`}
            >
              <div
                className={`flex items-center justify-between p-3 border ${
                  isLight
                    ? "bg-[#FFF9E6] border-[#4C9DB0]/30"
                    : "bg-[#141414] border-white/10"
                }`}
              >
                <div>
                  <div className="font-semibold">Citation Strictness</div>
                  <div
                    className={`text-[11px] ${
                      isLight ? "text-[#395d6a]" : "text-zinc-500"
                    }`}
                  >
                    Verify against stored chunk metadata
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 border font-bold ${
                    isLight
                      ? "bg-[#4C9DB0]/15 border-[#4C9DB0] text-[#4C9DB0]"
                      : "bg-white/15 border-white text-white"
                  }`}
                >
                  Active
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 border ${
                  isLight
                    ? "bg-[#FFF9E6] border-[#4C9DB0]/30"
                    : "bg-[#141414] border-white/10"
                }`}
              >
                <div>
                  <div className="font-semibold">Offline Fallback</div>
                  <div
                    className={`text-[11px] ${
                      isLight ? "text-[#395d6a]" : "text-zinc-500"
                    }`}
                  >
                    Deterministic local n-gram vectors
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 border font-bold ${
                    isLight
                      ? "bg-[#4C9DB0]/10 border-[#4C9DB0]/40 text-[#4C9DB0]"
                      : "bg-white/10 border-white/20 text-white"
                  }`}
                >
                  Auto
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 border ${
                  isLight
                    ? "bg-[#FFF9E6] border-[#4C9DB0]/30"
                    : "bg-[#141414] border-white/10"
                }`}
              >
                <div>
                  <div className="font-semibold">Chunking Window</div>
                  <div
                    className={`text-[11px] ${
                      isLight ? "text-[#395d6a]" : "text-zinc-500"
                    }`}
                  >
                    800 chars / 150 overlap (Sentence-snapped)
                  </div>
                </div>
                <span className="font-mono">800/150</span>
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
          theme={theme}
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
