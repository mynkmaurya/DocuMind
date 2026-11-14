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
        "Unsupported file type. Please choose a PDF (.pdf) document."
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
        className={`group cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
          isDragging
            ? "border-indigo-600 bg-indigo-50/70"
            : "border-slate-300 bg-white hover:border-indigo-500 hover:bg-slate-50"
        } ${isUploading ? "pointer-events-none opacity-75" : ""}`}
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
        <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
          {isUploading ? "Uploading PDF…" : "Upload a PDF document"}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Drag & drop or press Enter to browse · Text-based PDF up to {maxSizeMb}{" "}
          MB
        </p>

        {isUploading && (
          <div className="mt-3 w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-indigo-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="mt-1 block text-xs font-medium text-indigo-700">
              {uploadProgress}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploader;
