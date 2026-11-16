import React from "react";
import { ChatMessageItem, Citation } from "../types/documind";
import { CitationLink } from "./CitationLink";

interface ChatMessageProps {
  message: ChatMessageItem;
  theme?: "dark" | "light";
  onOpenCitationPage: (
    documentId: string,
    pageNumber: number,
    citation: Citation
  ) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  theme = "dark",
  onOpenCitationPage,
}) => {
  const isUser = message.role === "user";
  const isLight = theme === "light";

  return (
    <article
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} my-2 animate-fade-in-up`}
    >
      <div
        className={`max-w-2xl text-sm leading-relaxed transition-all duration-300 ${
          isUser
            ? isLight
              ? "bg-[#4C9DB0] text-white px-4 py-2.5 shadow-md border border-[#4C9DB0]"
              : "bg-white text-black font-medium px-4 py-2.5 shadow-[0_4px_20px_rgba(255,255,255,0.2)] border border-white"
            : isLight
            ? "bg-[#FFFDF7] border border-[#4C9DB0]/30 px-4 sm:px-5 py-3.5 sm:py-4 text-[#011936] shadow-md backdrop-blur-md"
            : "bg-[#141414] border border-white/15 px-4 sm:px-5 py-3.5 sm:py-4 text-zinc-100 shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-md"
        }`}
      >
        {!isUser && (
          <div
            className={`flex items-center gap-2 mb-2.5 pb-2 border-b text-xs font-semibold ${
              isLight
                ? "border-[#4C9DB0]/20 text-[#011936]"
                : "border-white/10 text-zinc-400"
            }`}
          >
            <span
              className={`w-2 h-2 animate-pulse ${
                isLight
                  ? "bg-[#4C9DB0] shadow-[0_0_8px_#4C9DB0]"
                  : "bg-white shadow-[0_0_8px_#ffffff]"
              }`}
            />
            <span>DocuMind Grounded Assistant</span>
          </div>
        )}

        <div
          className={`whitespace-pre-wrap font-normal leading-relaxed ${
            isUser
              ? isLight
                ? "text-white"
                : "text-black"
              : isLight
              ? "text-[#011936]"
              : "text-zinc-100"
          }`}
        >
          {message.text}
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div
            className={`mt-3.5 border-t pt-3 animate-fade-in-up ${
              isLight ? "border-[#4C9DB0]/20" : "border-white/10"
            }`}
          >
            <div
              className={`mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                isLight ? "text-[#4C9DB0]" : "text-zinc-400"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Verified Page Citations</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <CitationLink
                  key={`${message.id}-${citation.chunk_id}`}
                  citation={citation}
                  theme={theme}
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

export default ChatMessage;
