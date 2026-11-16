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
  placeholder = "Ask me anything...",
  activeDocumentName,
  onSendQuestion,
  onOpenUploadModal,
  onOpenToolsModal,
}) => {
  const [question, setQuestion] = useState("");
  const [isFocused, setIsFocused] = useState(false);
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
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  };

  const hasContent = question.trim().length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto transition-transform duration-300">
      {/* Outer container card with metallic chrome border highlight matching Figma */}
      <div
        className={`relative rounded-3xl p-1 bg-gradient-to-b from-[#141a27]/90 via-[#0e131e]/95 to-[#080b12]/98 border transition-all duration-300 backdrop-blur-2xl ${
          isFocused
            ? "border-white/30 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(255,255,255,0.12)] scale-[1.006]"
            : "border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.75)]"
        }`}
      >
        {/* Top banner: Unlock more features with Pro + Explore Pro ↗ */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2 text-[11px] sm:text-xs font-medium text-slate-300">
          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="text-white/80">✦</span>
            <span className="font-semibold text-slate-200">
              {activeDocumentName
                ? `Grounded on: ${activeDocumentName}`
                : "Unlock more features with Pro"}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenToolsModal}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
          >
            <span>Explore Pro</span>
            <span className="text-[12px]">↗</span>
          </button>
        </div>

        {/* Inner dark input area */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-[#070a10] border border-white/5 p-3 sm:p-4 transition-colors duration-200"
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              activeDocumentName
                ? `Ask about ${activeDocumentName}...`
                : placeholder
            }
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="w-full resize-none bg-transparent px-2 pt-1 pb-2 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] transition-all"
          />

          {/* Bottom toolbar inside input box */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
            {/* Left buttons: Import file & Tools matching Figma capsule style */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121724]/90 hover:bg-[#1a2234] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all focus:outline-none"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-400"
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
                className="btn-tactile inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121724]/90 hover:bg-[#1a2234] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all focus:outline-none"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                <span>Tools</span>
              </button>
            </div>

            {/* Right buttons: Sparkle Model dropdown & Glossy Liquid Chrome Send Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenToolsModal}
                title="AI Model Selector"
                className="flex items-center gap-1 text-slate-400 hover:text-white text-xs transition-colors p-1"
              >
                <span className="text-sm">✦</span>
                <span className="text-[10px]">▾</span>
              </button>

              {/* Glossy Liquid Chrome Circular Send Button matching Figma */}
              <button
                type="submit"
                disabled={disabled || !hasContent}
                aria-label="Send question"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-slate-300 via-white to-slate-400 hover:from-white hover:to-slate-200 active:scale-90 text-slate-950 flex items-center justify-center font-black transition-all duration-200 shadow-[0_2px_12px_rgba(255,255,255,0.4)] border border-white/80 ${
                  hasContent && !disabled
                    ? "opacity-100 scale-105 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                    : "opacity-50 cursor-not-allowed scale-100"
                }`}
              >
                <svg
                  className="w-4 h-4 stroke-[2.8]"
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
