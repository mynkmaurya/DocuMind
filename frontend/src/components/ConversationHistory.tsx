import React from "react";
import { Conversation } from "../types/documind";

interface ConversationHistoryProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  disabled?: boolean;
  theme?: "dark" | "light";
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  activeConversationId,
  disabled = false,
  theme = "dark",
  onSelectConversation,
  onCreateConversation,
}) => {
  const isLight = theme === "light";

  return (
    <section aria-label="Conversation history" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            isLight ? "text-[#4C9DB0]" : "text-zinc-400"
          }`}
        >
          Chat Sessions
        </h2>
        <button
          type="button"
          disabled={disabled}
          onClick={onCreateConversation}
          className={`btn-tactile border px-2.5 py-1 text-xs font-semibold disabled:opacity-40 transition-colors ${
            isLight
              ? "border-[#4C9DB0]/30 bg-[#4C9DB0]/15 text-[#4C9DB0] hover:bg-[#4C9DB0] hover:text-white"
              : "border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
          }`}
        >
          + New Chat
        </button>
      </div>

      {conversations.length === 0 ? (
        <p
          className={`border p-3 text-xs ${
            isLight
              ? "border-[#4C9DB0]/20 bg-[#FFF9E6] text-[#395d6a]"
              : "border-white/10 bg-[#141414] text-zinc-400"
          }`}
        >
          No chat history yet. Ask a question to begin a thread.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {conversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            return (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full px-3 py-2 text-left text-xs transition-all border ${
                    isSelected
                      ? isLight
                        ? "bg-[#4C9DB0] text-white font-semibold shadow-md border-[#4C9DB0]"
                        : "bg-white text-black font-semibold shadow-md border-white"
                      : isLight
                      ? "bg-[#FFFDF7] border-[#4C9DB0]/20 text-[#011936] hover:border-[#4C9DB0]"
                      : "bg-[#141414] border-white/10 text-zinc-300 hover:border-white/40"
                  }`}
                >
                  <div className="truncate">{conv.title}</div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      isSelected
                        ? isLight
                          ? "text-white/80"
                          : "text-black/80"
                        : isLight
                        ? "text-[#395d6a]"
                        : "text-zinc-500"
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

export default ConversationHistory;
