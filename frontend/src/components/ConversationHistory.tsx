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

export default ConversationHistory;
