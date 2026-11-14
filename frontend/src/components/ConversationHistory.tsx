import React from "react";
import { Conversation } from "../types/documind";

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
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Chat Sessions
        </h2>
        <button
          type="button"
          disabled={disabled}
          onClick={onCreateConversation}
          className="rounded-lg bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 disabled:opacity-40 transition-colors"
        >
          + New Chat
        </button>
      </div>

      {conversations.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-[#0c111a] p-3 text-xs text-slate-500">
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
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-all ${
                    isSelected
                      ? "bg-sky-500 text-white font-semibold shadow-[0_0_15px_rgba(14,165,233,0.35)]"
                      : "bg-[#0d121c] border border-slate-800/80 text-slate-300 hover:bg-[#131a28] hover:border-slate-700"
                  }`}
                >
                  <div className="truncate">{conv.title}</div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      isSelected ? "text-sky-100" : "text-slate-500"
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
