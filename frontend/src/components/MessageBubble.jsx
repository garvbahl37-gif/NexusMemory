import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { format } from "date-fns";
import {
  Brain,
  FileText,
  User,
  Copy,
  Check,
  Zap,
  Pencil,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState, useRef } from "react";
import { speak, stopSpeaking, ttsSupported } from "../utils/voice";

function SpeakButton({ text }) {
  const [speaking, setSpeaking] = useState(false);
  if (!ttsSupported()) return null;

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text);
      setSpeaking(true);
      // Best-effort reset when speech ends.
      const t = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeaking(false);
          clearInterval(t);
        }
      }, 400);
    }
  };

  return (
    <button
      onClick={toggle}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-nexus-muted hover:text-nexus-text"
      title={speaking ? "Stop" : "Read aloud"}
    >
      {speaking ? (
        <VolumeX className="w-3.5 h-3.5 text-nexus-accent-light" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

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

// Code block with a hover copy button (used to override markdown <pre>).
function PreBlock({ children }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = ref.current?.innerText || "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/code relative my-3">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 rounded-md border border-nexus-border/70 bg-nexus-surface/90 p-1.5 text-nexus-muted opacity-0 backdrop-blur-sm transition-opacity hover:text-nexus-text group-hover/code:opacity-100"
        title="Copy code"
      >
        {copied ? (
          <Check className="h-3 w-3 text-nexus-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
      <pre ref={ref}>{children}</pre>
    </div>
  );
}

const MARKDOWN_COMPONENTS = { pre: PreBlock };

export default function MessageBubble({
  message,
  isStreaming = false,
  onEdit,
}) {
  const isUser = message.role === "user";
  const timestamp = message.timestamp
    ? format(new Date(message.timestamp), "HH:mm")
    : "";

  const memoriesUsed = message.metadata?.memories_used || 0;
  const docsRetrieved = message.metadata?.docs_retrieved || 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  if (isUser) {
    const submitEdit = () => {
      if (draft.trim() && draft.trim() !== message.content) {
        onEdit?.(message.id, draft.trim());
      }
      setEditing(false);
    };

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
            {onEdit && !editing && (
              <button
                onClick={() => {
                  setDraft(message.content);
                  setEditing(true);
                }}
                title="Edit & resend"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-nexus-muted hover:text-nexus-text"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <CopyButton text={message.content} />
            <span className="text-[11px] text-nexus-muted">{timestamp}</span>
          </div>

          {editing ? (
            <div className="w-[min(78vw,32rem)] rounded-2xl rounded-tr-md border border-nexus-accent/40 bg-nexus-surface p-2">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitEdit();
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
                rows={Math.min(6, draft.split("\n").length + 1)}
                className="w-full resize-none bg-transparent text-sm text-nexus-text outline-none"
              />
              <div className="mt-1 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-md px-2 py-1 text-xs text-nexus-muted hover:text-nexus-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={submitEdit}
                  className="rounded-md bg-nexus-accent px-3 py-1 text-xs font-medium text-white hover:bg-nexus-accent-light"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl rounded-tr-md bg-gradient-to-br from-nexus-accent to-purple-600
                         px-4 py-2.5 text-sm leading-relaxed text-white
                         shadow-lg shadow-nexus-accent/20 ring-1 ring-white/10
                         whitespace-pre-wrap break-words"
            >
              {message.content}
            </div>
          )}
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
          {!isStreaming && <SpeakButton text={message.content} />}
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                components={MARKDOWN_COMPONENTS}
              >
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

        {/* Inline citations */}
        {message.metadata?.citations?.length > 0 && (
          <div className="mt-1.5 space-y-1 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-nexus-muted">
              Sources
            </p>
            {message.metadata.citations.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 rounded-lg border border-nexus-border/60 bg-nexus-card/60 px-2 py-1.5"
              >
                <FileText className="mt-0.5 h-3 w-3 flex-shrink-0 text-nexus-accent-light" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-nexus-text/90">
                    {c.source}
                    {c.page ? ` · p.${c.page}` : ""}
                  </p>
                  {c.snippet && (
                    <p className="line-clamp-2 text-[10px] text-nexus-muted">
                      {c.snippet}…
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
