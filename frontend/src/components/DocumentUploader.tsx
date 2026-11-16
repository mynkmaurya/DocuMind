import React, { useRef, useState } from "react";

interface DocumentUploaderProps {
  isUploading: boolean;
  uploadProgress?: number;
  theme?: "dark" | "light";
  onUploadFile: (file: File) => void;
  onValidationError?: (message: string) => void;
  maxSizeMb?: number;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  isUploading,
  uploadProgress = 0,
  theme = "dark",
  onUploadFile,
  onValidationError,
  maxSizeMb = 50,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isLight = theme === "light";

  const validateAndSubmit = (file?: File) => {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      onValidationError?.("Only PDF documents are allowed.");
      return;
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      onValidationError?.(`File is too large. Maximum size is ${maxSizeMb} MB.`);
      return;
    }

    onUploadFile(file);
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF Document"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          validateAndSubmit(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`group cursor-pointer border-2 border-dashed p-4 text-center transition-all duration-200 focus-visible:outline-none ${
          isLight
            ? isDragging
              ? "border-[#4C9DB0] bg-[#4C9DB0]/10 shadow-[0_0_25px_rgba(76,157,176,0.25)]"
              : "border-[#4C9DB0]/40 bg-[#FFF9E6] hover:border-[#4C9DB0] hover:bg-[#FFFDF7]"
            : isDragging
            ? "border-white bg-white/10 shadow-[0_0_25px_rgba(255,255,255,0.25)]"
            : "border-white/20 bg-[#141414] hover:border-white hover:bg-[#1a1a1a]"
        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            validateAndSubmit(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div
          className={`mx-auto w-10 h-10 border flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform ${
            isLight
              ? "bg-[#4C9DB0]/15 border-[#4C9DB0]/30 text-[#4C9DB0]"
              : "bg-white/10 border-white/20 text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div
          className={`text-sm font-semibold transition-colors ${
            isLight
              ? "text-[#011936] group-hover:text-[#4C9DB0]"
              : "text-zinc-200 group-hover:text-white"
          }`}
        >
          {isUploading ? "Uploading & Processing PDF…" : "Upload a PDF Document"}
        </div>
        <p
          className={`mt-1 text-xs ${
            isLight ? "text-[#395d6a]" : "text-zinc-400"
          }`}
        >
          Drag & drop or click to browse · Up to {maxSizeMb} MB
        </p>

        {isUploading && (
          <div className="mt-3.5 w-full">
            <div
              className={`h-1.5 w-full overflow-hidden ${
                isLight ? "bg-[#4C9DB0]/20" : "bg-zinc-800"
              }`}
            >
              <div
                className={`h-full transition-all duration-200 ${
                  isLight
                    ? "bg-[#4C9DB0] shadow-[0_0_8px_#4C9DB0]"
                    : "bg-white shadow-[0_0_8px_#ffffff]"
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span
              className={`mt-1.5 block text-xs font-medium ${
                isLight ? "text-[#4C9DB0]" : "text-white"
              }`}
            >
              {uploadProgress}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploader;
