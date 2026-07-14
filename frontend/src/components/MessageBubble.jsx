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
      className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-nexus-subtle transition-all duration-micro ease-nexus hover:bg-nexus-elevated hover:text-nexus-text focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
      title={speaking ? "Stop" : "Read aloud"}
    >
      {speaking ? (
        <VolumeX className="w-3.5 h-3.5 text-nexus-accent" />
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
      className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-nexus-subtle
                 transition-all duration-micro ease-nexus hover:bg-nexus-elevated hover:text-nexus-text
                 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
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
        className="absolute right-2 top-2 z-10 rounded-md border border-nexus-border bg-nexus-elevated/90 p-1.5 text-nexus-muted opacity-0 shadow-nexus-e1 backdrop-blur-sm transition-all duration-micro ease-nexus hover:text-nexus-text group-hover/code:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
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
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-nexus-border bg-nexus-elevated shadow-nexus-e1">
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
                className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-nexus-subtle transition-all duration-micro ease-nexus hover:bg-nexus-elevated hover:text-nexus-text focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <CopyButton text={message.content} />
            <span className="font-mono text-[11px] tabular-nums text-nexus-subtle">
              {timestamp}
            </span>
          </div>

          {editing ? (
            <div className="w-[min(78vw,32rem)] rounded-2xl rounded-tr-md border border-nexus-accent-rim bg-nexus-surface p-2 shadow-nexus-e2">
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
                  className="rounded-md px-2 py-1 text-xs text-nexus-muted transition-colors duration-micro ease-nexus hover:bg-nexus-elevated hover:text-nexus-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={submitEdit}
                  className="rounded-md bg-nexus-accent px-3 py-1 text-xs font-medium text-nexus-accent-ink transition-all duration-micro ease-nexus hover:bg-nexus-accent-light active:scale-[0.98] active:bg-nexus-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl rounded-tr-md border border-nexus-border border-r-2 border-r-nexus-accent
                         bg-nexus-elevated px-4 py-2.5 text-sm leading-relaxed text-nexus-text
                         shadow-nexus-e2
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
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-nexus-accent-rim bg-nexus-elevated shadow-nexus-e1">
        <Zap className="h-4 w-4 text-nexus-accent" />
      </div>

      <div className="flex min-w-0 max-w-[82%] flex-col gap-1">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-medium uppercase tracking-label text-nexus-muted">
            Nexus
          </span>
          <span className="font-mono text-[11px] tabular-nums text-nexus-subtle">
            {timestamp}
          </span>
          <CopyButton text={message.content} />
          {!isStreaming && <SpeakButton text={message.content} />}
        </div>

        {/* Machined card: 1px edge ring + inset top hairline on the inner surface */}
        <div
          className={`rounded-2xl rounded-tl-md p-[1px] shadow-nexus-e2 ${
            message.isError ? "bg-nexus-error/50" : "bg-nexus-border"
          }`}
        >
          <div
            className={`rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-nexus-text shadow-nexus-e1 ${
              message.isError ? "bg-nexus-error/[0.08]" : "bg-nexus-card"
            }`}
          >
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
              <span className="flex items-center gap-1.5 rounded-full border border-nexus-border bg-nexus-card px-2 py-0.5 text-[11px] text-nexus-muted shadow-nexus-e1">
                <Brain className="h-2.5 w-2.5 text-nexus-subtle" />
                {memoriesUsed} memories
              </span>
            )}
            {docsRetrieved > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-nexus-border bg-nexus-card px-2 py-0.5 text-[11px] text-nexus-muted shadow-nexus-e1">
                <FileText className="h-2.5 w-2.5 text-nexus-subtle" />
                {docsRetrieved} chunks
              </span>
            )}
          </div>
        )}

        {/* Inline citations */}
        {message.metadata?.citations?.length > 0 && (
          <div className="mt-1.5 space-y-1 px-1">
            <p className="text-[11px] font-medium uppercase tracking-label text-nexus-muted">
              Sources
            </p>
            {message.metadata.citations.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-nexus-border bg-nexus-card px-2 py-1.5 shadow-nexus-e1 transition-colors duration-micro ease-nexus hover:bg-nexus-elevated"
              >
                <FileText className="mt-0.5 h-3 w-3 flex-shrink-0 text-nexus-subtle" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-nexus-text">
                    {c.source}
                    {c.page ? ` · p.${c.page}` : ""}
                  </p>
                  {c.snippet && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-nexus-muted">
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
