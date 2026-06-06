import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { Brain, FileText, User, Copy, Check, Zap } from "lucide-react";
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
        initial={{ opacity: 0, y: 10, x: 16 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="group mb-5 flex flex-row-reverse items-start gap-3"
      >
        {/* User Avatar */}
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-nexus-card border border-nexus-border ring-1 ring-white/5">
          <User className="h-4 w-4 text-nexus-muted" />
        </div>

        <div className="flex max-w-[78%] flex-col items-end gap-1">
          <div className="flex items-center gap-2 px-1">
            <CopyButton text={message.content} />
            <span className="text-[11px] text-nexus-muted">{timestamp}</span>
          </div>
          <div
            className="rounded-2xl rounded-tr-md bg-gradient-to-br from-nexus-accent to-purple-600
                       px-4 py-2.5 text-sm leading-relaxed text-white
                       shadow-lg shadow-nexus-accent/20 ring-1 ring-white/10
                       whitespace-pre-wrap break-words"
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="group mb-5 flex items-start gap-3"
    >
      {/* Nexus Avatar */}
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
        <Zap className="h-4 w-4 text-white" />
      </div>

      <div className="flex min-w-0 max-w-[82%] flex-col gap-1">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-semibold text-nexus-accent-light">
            Nexus
          </span>
          <span className="text-[11px] text-nexus-muted">{timestamp}</span>
          <CopyButton text={message.content} />
        </div>

        {/* Glass card with a subtle gradient-edge highlight */}
        <div
          className={`rounded-2xl rounded-tl-md p-[1px] shadow-lg shadow-black/20 ${
            message.isError
              ? "bg-nexus-error/40"
              : "bg-gradient-to-br from-white/12 to-white/[0.03]"
          }`}
        >
          <div className="rounded-2xl rounded-tl-md bg-nexus-card px-4 py-3 text-sm">
            <div className="prose-nexus">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-nexus-accent align-middle" />
            )}
          </div>
        </div>

        {/* Metadata badges */}
        {(memoriesUsed > 0 || docsRetrieved > 0) && (
          <div className="mt-1 flex items-center gap-2 px-1">
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
