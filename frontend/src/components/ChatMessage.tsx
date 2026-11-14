import React from "react";
import { ChatMessageItem, Citation } from "../types/documind";
import { CitationLink } from "./CitationLink";

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
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} my-2 animate-fade-in-up`}
    >
      <div
        className={`max-w-2xl text-sm leading-relaxed transition-all duration-300 ${
          isUser
            ? "rounded-2xl rounded-tr-sm bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-white shadow-[0_4px_20px_rgba(2,132,199,0.3)] border border-sky-400/30"
            : "rounded-2xl rounded-tl-sm bg-[#0e1422]/90 border border-slate-800/90 px-4 sm:px-5 py-3.5 sm:py-4 text-slate-200 shadow-[0_12px_35px_rgba(0,0,0,0.55)] backdrop-blur-md"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-800/60 text-xs font-semibold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
            <span>DocuMind Grounded Assistant</span>
          </div>
        )}

        <div className="whitespace-pre-wrap text-slate-100 font-normal leading-relaxed">
          {message.text}
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3.5 border-t border-slate-800/80 pt-3 animate-fade-in-up">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400/90">
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
