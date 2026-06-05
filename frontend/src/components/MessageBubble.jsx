import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { Brain, FileText, User, Copy, Check } from "lucide-react";
import { useState } from "react";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded
                 text-nexus-muted hover:text-nexus-text"
      title="Copy message"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-nexus-success" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export default function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === "user";
  const timestamp = message.timestamp
    ? format(new Date(message.timestamp), "HH:mm")
    : "";

  const memoriesUsed = message.metadata?.memories_used || 0;
  const docsRetrieved = message.metadata?.docs_retrieved || 0;

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-3 mb-4 flex-row-reverse group"
      >
        {/* User Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-nexus-surface border border-nexus-border flex items-center justify-center">
          <User className="w-4 h-4 text-nexus-muted" />
        </div>

        <div className="flex flex-col items-end gap-1 max-w-[75%]">
          <div className="flex items-center gap-2">
            <CopyButton text={message.content} />
            <span className="text-xs text-nexus-muted">{timestamp}</span>
          </div>
          <div
            className="bg-nexus-accent text-white rounded-2xl rounded-tr-sm
                         px-4 py-3 text-sm leading-relaxed"
          >
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 mb-4 group"
    >
      {/* Nexus Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
        <span className="text-white text-xs font-bold">N</span>
      </div>

      <div className="flex flex-col gap-1 max-w-[80%] min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-nexus-accent-light">
            Nexus
          </span>
          <span className="text-xs text-nexus-muted">{timestamp}</span>
          <CopyButton text={message.content} />
        </div>

        {/* Message content */}
        <div
          className={`bg-nexus-card border rounded-2xl rounded-tl-sm px-4 py-3
                       text-sm ${message.isError ? "border-nexus-error" : "border-nexus-border"}`}
        >
          <div className="prose-nexus">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-nexus-accent ml-0.5 animate-pulse" />
          )}
        </div>

        {/* Metadata badges */}
        {(memoriesUsed > 0 || docsRetrieved > 0) && (
          <div className="flex items-center gap-2 mt-1">
            {memoriesUsed > 0 && (
              <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800/30 rounded-full px-2 py-0.5">
                <Brain className="w-2.5 h-2.5" />
                {memoriesUsed} memories
              </span>
            )}
            {docsRetrieved > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 rounded-full px-2 py-0.5">
                <FileText className="w-2.5 h-2.5" />
                {docsRetrieved} chunks
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
