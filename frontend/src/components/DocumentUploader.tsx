import React, { useRef, useState } from "react";

interface DocumentUploaderProps {
  isUploading: boolean;
  uploadProgress: number;
  maxSizeMb?: number;
  onUploadFile: (file: File) => void;
  onValidationError: (message: string) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  isUploading,
  uploadProgress,
  maxSizeMb = 25,
  onUploadFile,
  onValidationError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSubmit = (file: File | undefined) => {
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      onValidationError(
        "Unsupported file type. Please select a PDF (.pdf) document."
      );
      return;
    }
    if (file.size === 0) {
      onValidationError("The selected PDF file is empty (0 bytes).");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      onValidationError(`File exceeds the ${maxSizeMb} MB limit.`);
      return;
    }
    onUploadFile(file);
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload a PDF document up to ${maxSizeMb} megabytes`}
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
        className={`group cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          isDragging
            ? "border-sky-500 bg-sky-500/10 shadow-[0_0_25px_rgba(56,189,248,0.25)]"
            : "border-slate-800 bg-[#0d121c]/80 hover:border-slate-700 hover:bg-[#111724]"
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

        <div className="mx-auto w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-2.5 group-hover:scale-105 transition-transform">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div className="text-sm font-semibold text-slate-200 group-hover:text-white">
          {isUploading ? "Uploading & Processing PDF…" : "Upload a PDF Document"}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Drag & drop or click to browse · Up to {maxSizeMb} MB
        </p>

        {isUploading && (
          <div className="mt-3.5 w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 shadow-[0_0_8px_#38bdf8] transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="mt-1.5 block text-xs font-medium text-sky-400">
              {uploadProgress}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploader;
