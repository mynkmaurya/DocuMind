import React, { useState } from "react";

interface MessageInputProps {
  disabled: boolean;
  placeholder?: string;
  onSendQuestion: (question: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled,
  placeholder = "Ask a question about the uploaded PDF…",
  onSendQuestion,
}) => {
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled) return;
    onSendQuestion(trimmed);
    setQuestion("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20"
    >
      <label htmlFor="documind-question-input" className="sr-only">
        Ask a question about the document
      </label>
      <textarea
        id="documind-question-input"
        rows={2}
        value={question}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !question.trim()}
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Ask
      </button>
    </form>
  );
};

export default MessageInput;
