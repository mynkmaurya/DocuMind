import React, { useRef, useState } from "react";

interface MessageInputProps {
  disabled: boolean;
  placeholder?: string;
  activeDocumentName?: string | null;
  theme?: "dark" | "light";
  onSendQuestion: (question: string) => void;
  onOpenUploadModal?: () => void;
  onOpenToolsModal?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled,
  placeholder = "Ask me anything...",
  activeDocumentName,
  theme = "dark",
  onSendQuestion,
  onOpenUploadModal,
  onOpenToolsModal,
}) => {
  const [question, setQuestion] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isLight = theme === "light";

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
      {/* Outer container card with straight edges and theme border */}
      <div
        className={`relative p-1 border transition-all duration-300 backdrop-blur-2xl ${
          isLight
            ? isFocused
              ? "bg-[#FFFDF7] border-[#4C9DB0] shadow-[0_20px_50px_rgba(76,157,176,0.25)]"
              : "bg-[#FFF9E6]/95 border-[#4C9DB0]/40 shadow-[0_15px_40px_rgba(76,157,176,0.15)]"
            : isFocused
            ? "bg-[#141414] border-white shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(255,255,255,0.18)]"
            : "bg-[#121212]/95 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
        }`}
      >
        {/* Top banner: Unlock more features with Pro + Explore Pro ↗ */}
        <div
          className={`flex items-center justify-between px-4 pt-2.5 pb-2 text-[11px] sm:text-xs font-medium border-b ${
            isLight
              ? "border-[#4C9DB0]/20 text-[#011936]"
              : "border-white/10 text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className={isLight ? "text-[#4C9DB0]" : "text-white"}>
              ✦
            </span>
            <span
              className={`font-semibold ${
                isLight ? "text-[#011936]" : "text-zinc-200"
              }`}
            >
              {activeDocumentName
                ? `Grounded on: ${activeDocumentName}`
                : "Unlock more features with Pro"}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenToolsModal}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              isLight
                ? "text-[#4C9DB0] hover:text-[#2d6774] font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Explore Pro</span>
            <span className="text-[12px]">↗</span>
          </button>
        </div>

        {/* Inner straight input area */}
        <form
          onSubmit={handleSubmit}
          className={`border p-3 sm:p-4 transition-colors duration-200 ${
            isLight
              ? "bg-[#FFFFFF] border-[#4C9DB0]/20"
              : "bg-[#0a0a0a] border-white/10"
          }`}
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
            className={`w-full resize-none bg-transparent px-2 pt-1 pb-2 text-sm sm:text-base focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] transition-all ${
              isLight
                ? "text-[#011936] placeholder:text-[#4C9DB0]/60"
                : "text-white placeholder:text-zinc-500"
            }`}
          />

          {/* Bottom toolbar inside input box */}
          <div
            className={`flex items-center justify-between pt-2 border-t mt-1 ${
              isLight ? "border-[#4C9DB0]/20" : "border-white/10"
            }`}
          >
            {/* Left buttons: Import file & Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenUploadModal}
                className={`btn-tactile inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none ${
                  isLight
                    ? "border-[#4C9DB0]/40 bg-[#FFEBAF] hover:bg-[#4C9DB0] text-[#011936] hover:text-white"
                    : "border-white/20 bg-[#161616] hover:bg-white hover:text-black hover:border-white text-zinc-200"
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 ${
                    isLight ? "text-[#4C9DB0]" : "text-zinc-400 group-hover:text-black"
                  }`}
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
                className={`btn-tactile inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none ${
                  isLight
                    ? "border-[#4C9DB0]/40 bg-[#FFEBAF] hover:bg-[#4C9DB0] text-[#011936] hover:text-white"
                    : "border-white/20 bg-[#161616] hover:bg-white hover:text-black hover:border-white text-zinc-200"
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 ${
                    isLight ? "text-[#4C9DB0]" : "text-zinc-400 group-hover:text-black"
                  }`}
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

            {/* Right buttons: Sparkle Model dropdown & Send Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenToolsModal}
                title="AI Model Selector"
                className={`flex items-center gap-1 text-xs transition-colors p-1 ${
                  isLight
                    ? "text-[#4C9DB0] hover:text-[#011936]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="text-sm">✦</span>
                <span className="text-[10px]">▾</span>
              </button>

              {/* Square Send Button */}
              <button
                type="submit"
                disabled={disabled || !hasContent}
                aria-label="Send question"
                className={`w-8 h-8 sm:w-9 sm:h-9 border flex items-center justify-center font-black transition-all duration-200 ${
                  isLight
                    ? `bg-[#4C9DB0] hover:bg-[#387c8c] text-white border-[#4C9DB0] ${
                        hasContent && !disabled
                          ? "opacity-100 scale-105 cursor-pointer shadow-[0_0_15px_rgba(76,157,176,0.6)]"
                          : "opacity-40 cursor-not-allowed scale-100"
                      }`
                    : `bg-white hover:bg-zinc-200 text-black border-white ${
                        hasContent && !disabled
                          ? "opacity-100 scale-105 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                          : "opacity-30 cursor-not-allowed scale-100"
                      }`
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
