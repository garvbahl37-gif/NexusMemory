import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Brain,
  Upload,
  Paperclip,
  Zap,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  FileText,
  History,
  ArrowUpRight,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import UploadSection from "./UploadSection";
import MemoryPanel from "./MemoryPanel";
import ModelSelector from "./ModelSelector";
import { useChat } from "../hooks/useChat";
import { getSessionMessages, getMemories } from "../services/api";

export default function ChatWindow({
  sessionId,
  onNewSession,
  onSidebarToggle,
}) {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama3");
  const [showUpload, setShowUpload] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memories, setMemories] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    messages,
    setMessages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
  } = useChat(sessionId);

  // Load session history when session changes
  useEffect(() => {
    if (sessionId) {
      loadSessionHistory();
      loadMemories();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom();
    }
  }, [messages, streamingContent]);

  const loadSessionHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getSessionMessages(sessionId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadMemories = async () => {
    if (!sessionId) return;
    try {
      const data = await getMemories(sessionId);
      setMemories(data.memories || []);
    } catch (err) {
      console.error("Failed to load memories:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollButton(distanceFromBottom > 200);
  };

  // Send arbitrary text (used by the input bar AND the welcome cards).
  const sendText = async (text) => {
    const message = (text || "").trim();
    if (!message || isStreaming) return;

    // Create a session on the fly if needed, and pass it directly so the
    // first message isn't lost to a not-yet-propagated state update.
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = onNewSession();
    }

    await sendMessage(message, selectedModel, activeSessionId);
    setTimeout(() => loadMemories(), 2500);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const message = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendText(message);
  };

  // Welcome-screen suggestion cards.
  const handleSuggestion = (s) => {
    if (isStreaming) return;
    if (s.action === "upload") {
      // Spin up a session and reveal the upload panel.
      if (!sessionId) onNewSession();
      setShowUpload(true);
      return;
    }
    sendText(s.prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  // ── Welcome Screen ──────────────────────────────────────────────────────────
  if (!sessionId && messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          onSidebarToggle={onSidebarToggle}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          showMemory={showMemory}
          setShowMemory={setShowMemory}
          memoryCount={memories.length}
          sessionId={sessionId}
        />
        <div className="relative flex-1 flex overflow-hidden">
          <WelcomeAmbient />
          {/* Scroll-safe centering: centers when there's room, scrolls (top
              reachable) when content is taller than the viewport. */}
          <div className="relative z-10 flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">
              <WelcomeScreen onSuggestion={handleSuggestion} />
            </div>
          </div>
        </div>
        <InputBar
          input={input}
          setInput={handleTextareaChange}
          onSend={handleSend}
          isStreaming={isStreaming}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          showUpload={showUpload}
          setShowUpload={setShowUpload}
          sessionId={sessionId}
          onUploadComplete={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar
          onSidebarToggle={onSidebarToggle}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          showMemory={showMemory}
          setShowMemory={setShowMemory}
          memoryCount={memories.length}
          sessionId={sessionId}
        />

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-24">
              <div className="text-xs text-nexus-muted">Loading history...</div>
            </div>
          ) : (
            <>
              {/* Message list */}
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={false}
                  />
                ))}
              </AnimatePresence>

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingContent,
                    timestamp: new Date().toISOString(),
                  }}
                  isStreaming={true}
                />
              )}

              {/* Typing indicator (before first token) */}
              {isStreaming && !streamingContent && <TypingIndicator />}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 p-2 rounded-full
                         bg-nexus-card border border-nexus-border shadow-lg
                         text-nexus-muted hover:text-nexus-text transition-colors z-10"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Upload Panel (collapsible above input) */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-nexus-border px-4 py-3 overflow-hidden"
            >
              <UploadSection
                sessionId={sessionId}
                onUploadComplete={() => loadMemories()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <InputBar
          input={input}
          setInput={handleTextareaChange}
          onSend={handleSend}
          isStreaming={isStreaming}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          showUpload={showUpload}
          setShowUpload={setShowUpload}
          sessionId={sessionId}
          onUploadComplete={() => loadMemories()}
        />
      </div>

      {/* Memory Side Panel */}
      <AnimatePresence>
        {showMemory && sessionId && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 280 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <MemoryPanel
              sessionId={sessionId}
              memories={memories}
              onClose={() => setShowMemory(false)}
              onMemoryChange={loadMemories}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TopBar({
  onSidebarToggle,
  selectedModel,
  setSelectedModel,
  showMemory,
  setShowMemory,
  memoryCount,
  sessionId,
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3
                    border-b border-nexus-border flex-shrink-0
                    bg-nexus-surface/80 backdrop-blur-sm
                    min-w-0 overflow-hidden"
    >
      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        {/* Mobile sidebar toggle */}
        <button
          onClick={onSidebarToggle}
          className="md:hidden p-1.5 rounded-lg hover:bg-nexus-card
                     text-nexus-muted hover:text-nexus-text
                     transition-colors flex-shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-6 h-6 rounded-lg bg-gradient-to-br
                          from-indigo-500 to-purple-600
                          flex items-center justify-center flex-shrink-0"
          >
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span
            className="text-sm font-semibold text-nexus-text
                           hidden sm:block whitespace-nowrap"
          >
            Nexus Memory
          </span>
        </div>
      </div>

      {/* Right side — fixed width, no overflow */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {/* Memory toggle */}
        {sessionId && (
          <button
            onClick={() => setShowMemory(!showMemory)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5
                         rounded-lg text-xs font-medium
                         transition-all duration-200 whitespace-nowrap
                         ${
                           showMemory
                             ? "bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent-light"
                             : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-card"
                         }`}
          >
            <Brain className="w-3.5 h-3.5 flex-shrink-0" />
            {memoryCount > 0 && (
              <span
                className="bg-nexus-accent/20 text-nexus-accent-light
                               px-1.5 py-0.5 rounded-full text-xs
                               font-medium leading-none"
              >
                {memoryCount}
              </span>
            )}
            <span className="hidden sm:block">Memory</span>
          </button>
        )}

        {/* Model selector — always visible, dropdown-aware */}
        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
      </div>
    </div>
  );
}

function InputBar({
  input,
  setInput,
  onSend,
  isStreaming,
  onKeyDown,
  textareaRef,
  showUpload,
  setShowUpload,
  sessionId,
  onUploadComplete,
}) {
  return (
    <div
      className="flex-shrink-0 border-t border-nexus-border bg-nexus-surface/80
                    backdrop-blur-sm px-4 py-3"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2">
          {/* Upload toggle */}
          <button
            onClick={() => setShowUpload(!showUpload)}
            disabled={!sessionId}
            title={sessionId ? "Upload document" : "Start a chat first"}
            className={`p-2.5 rounded-xl border transition-all duration-200 flex-shrink-0
                         disabled:opacity-40 disabled:cursor-not-allowed mb-0.5
                         ${
                           showUpload
                             ? "bg-nexus-accent/10 border-nexus-accent/40 text-nexus-accent"
                             : "border-nexus-border text-nexus-muted hover:text-nexus-text hover:border-nexus-accent/40"
                         }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={setInput}
              onKeyDown={onKeyDown}
              placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={isStreaming}
              className="w-full nexus-input resize-none py-3 pr-12 text-sm
                         max-h-40 leading-relaxed disabled:opacity-60
                         disabled:cursor-not-allowed"
              style={{ minHeight: "48px" }}
            />

            {/* Char counter (optional) */}
            {input.length > 500 && (
              <span className="absolute bottom-2 right-14 text-xs text-nexus-muted">
                {input.length}
              </span>
            )}
          </div>

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSend}
            disabled={!input.trim() || isStreaming}
            className="p-2.5 rounded-xl bg-nexus-accent text-white
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:bg-nexus-accent-light transition-all duration-200
                       flex-shrink-0 mb-0.5 shadow-lg shadow-nexus-accent/20"
          >
            {isStreaming ? (
              <div
                className="w-4 h-4 border-2 border-white/30 border-t-white
                              rounded-full animate-spin"
              />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Bottom hint */}
        <p className="text-xs text-nexus-muted text-center mt-2 hidden sm:block">
          Nexus Memory · lightning-fast responses · remembers you across sessions
        </p>
      </div>
    </div>
  );
}

// Animated ambient backdrop behind the welcome content — drifting aurora
// orbs and a masked grid for depth.
function WelcomeAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-600/20 blur-[90px]"
        animate={{ x: [0, 50, 0], y: [0, 35, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/4 -right-28 h-96 w-96 rounded-full bg-cyan-500/15 blur-[100px]"
        animate={{ x: [0, -60, 0], y: [0, 45, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[90px]"
        animate={{ x: [0, 35, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 opacity-[0.12] [background:linear-gradient(rgba(99,102,241,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.5)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
    </div>
  );
}

function WelcomeScreen({ onSuggestion }) {
  const suggestions = [
    {
      icon: Sparkles,
      label: "Get started",
      prompt: "What's your name and what can you do?",
      action: "send",
      accent: "from-indigo-500 to-purple-600",
      glow: "group-hover:shadow-indigo-500/40",
    },
    {
      icon: Brain,
      label: "Teach me a fact",
      prompt: "My favorite framework is FastAPI — remember that.",
      action: "send",
      accent: "from-fuchsia-500 to-pink-600",
      glow: "group-hover:shadow-fuchsia-500/40",
    },
    {
      icon: FileText,
      label: "Chat with a PDF",
      prompt: "Upload a PDF and I'll answer questions from it.",
      action: "upload",
      accent: "from-cyan-500 to-blue-600",
      glow: "group-hover:shadow-cyan-500/40",
    },
    {
      icon: History,
      label: "Recall memory",
      prompt: "What do you remember about me from before?",
      action: "send",
      accent: "from-emerald-500 to-teal-600",
      glow: "group-hover:shadow-emerald-500/40",
    },
  ];

  const features = [
    { icon: Brain, text: "Remembers you" },
    { icon: FileText, text: "Reads your docs" },
    { icon: Gauge, text: "Lightning fast" },
    { icon: ShieldCheck, text: "Private memory" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 text-center max-w-2xl w-full"
    >
      {/* Animated logo */}
      <div className="relative mx-auto mb-7 h-20 w-20">
        <motion.div
          className="absolute -inset-4 rounded-full bg-nexus-accent/20 blur-2xl"
          animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.15, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-3xl border border-nexus-accent/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -inset-1 rounded-[1.4rem] border border-cyan-400/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 shadow-2xl shadow-indigo-500/30"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap className="h-9 w-9 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
        </motion.div>
      </div>

      {/* Status pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] font-medium tracking-wide text-emerald-300/90">
          Online · Groq Llama 3.3
        </span>
      </motion.div>

      <h1 className="text-3xl sm:text-4xl font-bold text-nexus-text mb-3 tracking-tight">
        Welcome to <span className="gradient-text">Nexus Memory</span>
      </h1>

      <p className="text-nexus-muted text-sm sm:text-base mb-6 leading-relaxed max-w-md mx-auto">
        An AI assistant that <span className="text-nexus-text/90">remembers you</span>,
        answers from <span className="text-nexus-text/90">your documents</span>, and
        replies in an instant.
      </p>

      {/* Feature pills */}
      <div className="mb-9 flex flex-wrap items-center justify-center gap-2">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.span
              key={f.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.06 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-nexus-border/70 bg-nexus-card/50 px-3 py-1 text-[11px] text-nexus-muted backdrop-blur-sm"
            >
              <Icon className="h-3 w-3 text-nexus-accent-light" />
              {f.text}
            </motion.span>
          );
        })}
      </div>

      {/* Premium suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {suggestions.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => onSuggestion(s)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5 + i * 0.09,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -4, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden rounded-2xl p-[1px]
                         bg-gradient-to-br from-white/10 to-white/[0.02]
                         transition-all duration-300
                         hover:from-nexus-accent/60 hover:to-cyan-400/30"
            >
              <div
                className={`relative flex h-full items-start gap-3 rounded-2xl
                            bg-nexus-card/80 p-4 backdrop-blur-xl
                            shadow-lg shadow-black/20 transition-shadow duration-300 ${s.glow}`}
              >
                {/* Shine sweep on hover */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {/* Icon tile */}
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center
                              rounded-xl bg-gradient-to-br ${s.accent}
                              shadow-md transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-nexus-accent-light">
                      {s.label}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-nexus-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                  </div>
                  <p className="mt-1 text-sm leading-snug text-nexus-text/90">
                    {s.prompt}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-7 text-[11px] text-nexus-muted/60">
        Pick one to begin, or just start typing below ↓
      </p>
    </motion.div>
  );
}
