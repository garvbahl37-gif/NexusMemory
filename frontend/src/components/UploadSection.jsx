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
} from "lucide-react";
import { uploadDocument, deleteDocument } from "../services/api";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function FileItem({ file, onRemove }) {
  const statusIcons = {
    uploading: (
      <Loader2 className="w-3.5 h-3.5 text-nexus-accent animate-spin" />
    ),
    processing: <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
    success: <CheckCircle className="w-3.5 h-3.5 text-nexus-success" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-nexus-error" />,
  };

  const statusColors = {
    uploading: "text-nexus-accent",
    processing: "text-amber-400",
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
      className="nexus-card p-2.5 flex items-center gap-2.5"
    >
      {/* File icon */}
      <div className="w-7 h-7 rounded-lg bg-nexus-surface flex items-center justify-center flex-shrink-0">
        <FileText className="w-3.5 h-3.5 text-nexus-accent" />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-nexus-text truncate">
          {file.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {statusIcons[file.status]}
          <span className={`text-xs ${statusColors[file.status]}`}>
            {statusLabels[file.status]}
          </span>
        </div>

        {/* Progress bar */}
        {file.status === "uploading" && (
          <div className="mt-1.5 h-0.5 bg-nexus-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-nexus-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${file.progress || 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      {(file.status === "success" || file.status === "error") && (
        <button
          onClick={() => onRemove(file)}
          className="p-1 rounded hover:bg-nexus-surface text-nexus-muted
                     hover:text-nexus-error transition-colors flex-shrink-0"
          title="Remove file"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
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
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer
                     transition-all duration-200
                     ${
                       isDragActive
                         ? "border-nexus-accent bg-nexus-accent/5 scale-[1.01]"
                         : "border-nexus-border hover:border-nexus-accent/50 hover:bg-nexus-card/50"
                     }`}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          transition={{ duration: 0.15 }}
        >
          <Upload
            className={`w-6 h-6 mx-auto mb-2 transition-colors
                              ${isDragActive ? "text-nexus-accent" : "text-nexus-muted"}`}
          />
          <p className="text-xs font-medium text-nexus-text mb-1">
            {isDragActive ? "Drop files here" : "Upload Documents"}
          </p>
          <p className="text-xs text-nexus-muted">PDF, TXT, MD — up to 50MB</p>
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
