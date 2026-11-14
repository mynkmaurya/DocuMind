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

export default ChatMessage;
