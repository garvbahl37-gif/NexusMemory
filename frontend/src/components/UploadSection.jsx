import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  File,
  Download,
} from "lucide-react";
import {
  uploadDocument,
  deleteDocument,
  documentDownloadUrl,
} from "../services/api";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// Humanize a byte count → "1.2 MB", "340 KB", etc.
function humanSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${i === 0 || n >= 10 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

function FileItem({ file, onRemove }) {
  const statusIcons = {
    uploading: (
      <Loader2 className="w-3.5 h-3.5 text-nexus-muted animate-spin" />
    ),
    processing: (
      <Loader2 className="w-3.5 h-3.5 text-nexus-warning animate-spin" />
    ),
    success: <CheckCircle className="w-3.5 h-3.5 text-nexus-success" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-nexus-error" />,
  };

  const statusColors = {
    uploading: "text-nexus-muted",
    processing: "text-nexus-warning",
    success: "text-nexus-success",
    error: "text-nexus-error",
  };

  const statusLabels = {
    uploading: `Uploading... ${file.progress || 0}%`,
    processing: "Processing chunks...",
    success: `${file.chunks || 0} chunks ready`,
    error: file.error || "Upload failed",
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-center gap-3 rounded-xl border border-nexus-border
                 bg-nexus-card px-3 py-2.5 shadow-nexus-e1 transition-all
                 duration-micro ease-nexus hover:bg-nexus-elevated hover:shadow-nexus-e2"
    >
      {/* File icon tile */}
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg
                   bg-nexus-elevated shadow-nexus-hairline
                   ring-1 ring-inset ring-nexus-border"
      >
        <FileText className="h-[18px] w-[18px] text-nexus-muted" />
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-nexus-text">{file.name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {statusIcons[file.status]}
          <span className={`text-[11px] ${statusColors[file.status]}`}>
            {statusLabels[file.status]}
          </span>
          {file.size > 0 && (
            <>
              <span className="text-nexus-subtle">·</span>
              <span className="text-[11px] text-nexus-subtle">
                {humanSize(file.size)}
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        {file.status === "uploading" && (
          <div className="mt-1.5 h-1 bg-nexus-border rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-nexus-accent"
              initial={{ width: 0 }}
              animate={{ width: `${file.progress || 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-0.5">
        {/* Download */}
        {file.status === "success" && file.documentId && (
          <a
            href={documentDownloadUrl(file.documentId)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-1.5 text-nexus-subtle outline-none transition-all
                       duration-micro ease-nexus hover:bg-nexus-surface hover:text-nexus-text
                       focus-visible:ring-2 focus-visible:ring-nexus-accent
                       focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg
                       active:scale-[0.98]"
            title="Download file"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Remove button */}
        {(file.status === "success" || file.status === "error") && (
          <button
            onClick={() => onRemove(file)}
            className="rounded-lg p-1.5 text-nexus-subtle outline-none transition-all
                       duration-micro ease-nexus hover:bg-nexus-error/10 hover:text-nexus-error
                       focus-visible:ring-2 focus-visible:ring-nexus-accent
                       focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg
                       active:scale-[0.98]"
            title="Remove file"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function UploadSection({ sessionId, onUploadComplete }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const updateFile = (name, updates) => {
    setUploadedFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, ...updates } : f)),
    );
  };

  const processFile = async (file) => {
    // Add file with uploading status
    const fileEntry = {
      id: Date.now(),
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 0,
      chunks: 0,
      documentId: null,
    };

    setUploadedFiles((prev) => [fileEntry, ...prev]);

    try {
      const result = await uploadDocument(file, sessionId, (progress) =>
        updateFile(file.name, { progress }),
      );

      updateFile(file.name, {
        status: "success",
        chunks: result.chunks,
        documentId: result.document_id,
        progress: 100,
      });

      onUploadComplete?.();
    } catch (err) {
      updateFile(file.name, {
        status: "error",
        error: err.response?.data?.detail || err.message || "Upload failed",
      });
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles, rejectedFiles) => {
      if (!sessionId) {
        alert("Please start a chat session before uploading documents.");
        return;
      }

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          const errors = rejection.errors.map((e) => e.message).join(", ");
          console.warn(`Rejected ${rejection.file.name}: ${errors}`);
        });
      }

      // Process accepted files sequentially
      for (const file of acceptedFiles) {
        await processFile(file);
      }
    },
    [sessionId],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: true,
  });

  const handleRemove = async (file) => {
    if (file.documentId) {
      try {
        await deleteDocument(file.documentId);
      } catch (err) {
        console.error("Failed to delete document:", err);
      }
    }
    setUploadedFiles((prev) => prev.filter((f) => f.name !== file.name));
    onUploadComplete?.();
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`group flex cursor-pointer flex-col items-center justify-center
                     rounded-xl border border-dashed px-5 py-4 text-center outline-none
                     transition-all duration-panel ease-nexus
                     focus-visible:ring-2 focus-visible:ring-nexus-accent
                     focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg
                     ${
                       isDragActive
                         ? "border-nexus-accent-rim bg-nexus-accent-soft shadow-nexus-glow"
                         : "border-nexus-border hover:border-nexus-accent-rim hover:bg-nexus-accent-soft"
                     }`}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={{ scale: isDragActive ? 1.04 : 1 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col items-center"
        >
          <div
            className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl
                        border shadow-nexus-hairline transition-colors duration-micro ease-nexus
                        ${
                          isDragActive
                            ? "border-nexus-accent-rim bg-nexus-elevated text-nexus-accent-light"
                            : "border-nexus-border bg-nexus-elevated text-nexus-muted group-hover:text-nexus-text"
                        }`}
          >
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold tracking-tight text-nexus-text">
            {isDragActive ? "Drop files here" : "Upload Documents"}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-label text-nexus-muted">
            PDF, DOCX, CSV, TXT, MD — up to 50MB
          </p>
        </motion.div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1.5 max-h-48 overflow-y-auto"
          >
            {uploadedFiles.map((file) => (
              <FileItem
                key={`${file.name}-${file.id}`}
                file={file}
                onRemove={handleRemove}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
