import React, { useRef, useState } from "react";

interface MessageInputProps {
  disabled: boolean;
  placeholder?: string;
  activeDocumentName?: string | null;
  onSendQuestion: (question: string) => void;
  onOpenUploadModal?: () => void;
  onOpenToolsModal?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled,
  placeholder = "Ask me anything…",
  activeDocumentName,
  onSendQuestion,
  onOpenUploadModal,
  onOpenToolsModal,
}) => {
  const [question, setQuestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled) return;
    onSendQuestion(trimmed);
    setQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    // Auto-adjust height up to max
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Outer container card with glowing border highlight matching the image */}
      <div className="relative rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-b from-[#1b2537]/80 to-[#101622]/90 border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        {/* Top subtle Pro / Grounded banner */}
        <div className="flex items-center justify-between px-3.5 sm:px-4 pt-2.5 pb-2 text-[11px] sm:text-xs font-medium text-slate-300">
          <div className="flex items-center gap-1.5 text-sky-400">
            <svg
              className="w-3.5 h-3.5 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-slate-200">
              {activeDocumentName
                ? `Grounded on: ${activeDocumentName}`
                : "Unlock more features with Pro"}
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-slate-500">
            DocuMind AI · Page Citations
          </span>
        </div>

        {/* Inner dark input area */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl sm:rounded-2xl bg-[#090d15]/95 border border-slate-800/80 p-2.5 sm:p-3 transition-colors focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/30"
        >
          <label htmlFor="documind-question-input" className="sr-only">
            Ask me anything
          </label>
          <textarea
            ref={textareaRef}
            id="documind-question-input"
            rows={1}
            value={question}
            disabled={disabled}
            placeholder={
              activeDocumentName
                ? `Ask about ${activeDocumentName} (e.g. key takeaways, summary)…`
                : placeholder
            }
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="w-full resize-none bg-transparent px-2 pt-1 pb-2 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px]"
          />

          {/* Bottom toolbar inside input box */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
            {/* Left buttons: Import file & Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="group inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-[#141b27] px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-300 hover:border-sky-500/40 hover:bg-[#1a2333] hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-sky-500/50"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                <span>Import file</span>
              </button>

              <button
                type="button"
                onClick={onOpenToolsModal}
                className="group inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-[#141b27] px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-300 hover:border-sky-500/40 hover:bg-[#1a2333] hover:text-white transition-all focus:outline-none focus:ring-1 focus:ring-sky-500/50"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span>Tools</span>
              </button>
            </div>

            {/* Right button: Electric Cyan Up Arrow */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Model: GPT-4o / Local Hybrid RAG"
                className="hidden sm:flex text-slate-500 hover:text-slate-300 p-1 rounded-full transition-colors"
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
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </button>

              <button
                type="submit"
                disabled={disabled || !question.trim()}
                aria-label="Send question"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0098ea] hover:bg-[#0089d4] active:scale-95 disabled:opacity-40 disabled:hover:bg-[#0098ea] disabled:cursor-not-allowed text-white flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,152,234,0.4)] transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#090d15]"
              >
                <svg
                  className="w-4 h-4 stroke-[2.5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageInput;
