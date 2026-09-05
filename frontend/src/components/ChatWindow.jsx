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
  Square,
  RotateCcw,
  Settings,
  Mic,
  Download,
} from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import UploadSection from "./UploadSection";
import MemoryPanel from "./MemoryPanel";
import ModelSelector from "./ModelSelector";
import SettingsModal, { loadSettings } from "./SettingsModal";
import { useChat } from "../hooks/useChat";
import { getSessionMessages, getMemories, checkHealth } from "../services/api";
import { createRecognizer, speechSupported, speak } from "../utils/voice";

export default function ChatWindow({
  sessionId,
  onNewSession,
  onSidebarToggle,
  onConversationSaved,
}) {
  const [input, setInput] = useState("");
  // Left empty until ModelSelector reports what the backend actually uses.
  const [selectedModel, setSelectedModel] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memories, setMemories] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const lastSpokenRef = useRef(null);
  const justCreatedRef = useRef(false); // session was just created locally

  const {
    messages,
    setMessages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    stopStreaming,
  } = useChat(sessionId);

  // Load session history when session changes — but NOT for a session we just
  // created by sending the first message (that would clobber the optimistic
  // messages + streaming and flash "Loading history…").
  useEffect(() => {
    if (sessionId) {
      if (justCreatedRef.current) {
        justCreatedRef.current = false;
        loadMemories();
      } else {
        loadSessionHistory();
        loadMemories();
      }
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  // Which provider is actually answering, for the status line.
  useEffect(() => {
    checkHealth()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom();
    }
  }, [messages, streamingContent]);

  // Auto-speak new assistant replies when enabled in settings.
  useEffect(() => {
    if (isStreaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenRef.current === last.id) return;
    lastSpokenRef.current = last.id;
    if (loadSettings().autoSpeak) speak(last.content);
  }, [messages, isStreaming]);

  const loadSessionHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getSessionMessages(sessionId);
      setMessages(data);
      // Don't auto-speak previously loaded history.
      lastSpokenRef.current = data[data.length - 1]?.id || null;
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
      justCreatedRef.current = true; // skip history-load for this new session
      activeSessionId = onNewSession();
    }

    await sendMessage(message, selectedModel, activeSessionId);
    // The session row and its title only exist once the reply is stored.
    onConversationSaved?.();
    setTimeout(() => loadMemories(), 2500);
  };

  // Slash commands. Returns true if the input was consumed.
  const handleSlash = (raw) => {
    const [cmd, ...rest] = raw.slice(1).split(" ");
    const arg = rest.join(" ").trim();
    switch (cmd.toLowerCase()) {
      case "clear":
        setMessages([]);
        return true;
      case "help":
        setMessages((prev) => [
          ...prev,
          {
            id: `help-${Date.now()}`,
            role: "assistant",
            content:
              "**Slash commands**\n\n- `/summarize` — summarize this conversation\n- `/translate <lang> <text>` — translate text\n- `/clear` — clear the screen\n- `/help` — show this help",
            timestamp: new Date().toISOString(),
          },
        ]);
        return true;
      case "summarize":
        sendText("Summarize our conversation so far in a few concise bullet points.");
        return true;
      case "translate": {
        const sp = arg.indexOf(" ");
        if (sp > 0) {
          const lang = arg.slice(0, sp);
          const text = arg.slice(sp + 1);
          sendText(`Translate the following into ${lang}:\n\n${text}`);
        }
        return true;
      }
      default:
        return false;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const message = input.trim();

    if (message.startsWith("/") && handleSlash(message)) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      return;
    }

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendText(message);
  };

  // Export the conversation to a Markdown file.
  const handleExport = () => {
    if (!messages.length) return;
    const md = messages
      .map((m) => {
        const who = m.role === "user" ? "**You**" : "**Nexus**";
        return `${who}:\n\n${m.content}\n`;
      })
      .join("\n---\n\n");
    const blob = new Blob([`# Nexus Memory — Conversation\n\n${md}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Regenerate the last assistant reply (re-runs the last user message).
  const handleRegenerate = () => {
    if (isStreaming) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => {
      const copy = [...prev];
      while (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
      return copy;
    });
    sendMessage(lastUser.content, selectedModel, sessionId, {
      skipUserMessage: true,
    });
  };

  // Edit a user message and re-run from there.
  const handleEditResend = (messageId, newContent) => {
    if (isStreaming || !newContent.trim()) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      if (idx === -1) return prev;
      return [
        ...prev.slice(0, idx),
        { ...prev[idx], content: newContent.trim() },
      ];
    });
    sendMessage(newContent.trim(), selectedModel, sessionId, {
      skipUserMessage: true,
    });
  };

  // Welcome-screen suggestion cards.
  const handleSuggestion = (s) => {
    if (isStreaming) return;
    if (s.action === "upload") {
      // Spin up a session and reveal the upload panel.
      if (!sessionId) {
        justCreatedRef.current = true;
        onNewSession();
      }
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
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <TopBar
          onSidebarToggle={onSidebarToggle}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          showMemory={showMemory}
          setShowMemory={setShowMemory}
          memoryCount={memories.length}
          sessionId={sessionId}
          onOpenSettings={() => setShowSettings(true)}
          onExport={handleExport}
          canExport={messages.length > 0}
        />
        <div className="relative flex-1 flex overflow-hidden">
          <WelcomeAmbient />
          {/* Scroll-safe centering: centers when there's room, scrolls (top
              reachable) when content is taller than the viewport. */}
          <div className="relative z-10 flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">
              <WelcomeScreen onSuggestion={handleSuggestion} status={status} />
            </div>
          </div>
        </div>
        <InputBar
          input={input}
          setInput={handleTextareaChange}
          onSend={handleSend}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          showUpload={showUpload}
          setShowUpload={setShowUpload}
          sessionId={sessionId}
          onUploadComplete={() => {}}
          onVoiceText={(t) => setInput(t)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
      {/* Main Chat Area — static aurora backdrop painted as a CSS background
          (no animated layers → zero scroll cost). */}
      <div className="relative flex-1 flex flex-col min-w-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(201,162,39,0.07),transparent_70%),radial-gradient(55%_45%_at_100%_100%,rgba(227,199,102,0.05),transparent_70%),radial-gradient(50%_45%_at_0%_95%,rgba(255,255,255,0.03),transparent_70%)]">
        {/* Top Bar */}
        <TopBar
          onSidebarToggle={onSidebarToggle}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          showMemory={showMemory}
          setShowMemory={setShowMemory}
          memoryCount={memories.length}
          sessionId={sessionId}
          onOpenSettings={() => setShowSettings(true)}
          onExport={handleExport}
          canExport={messages.length > 0}
        />

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="relative z-10 flex-1 overflow-y-auto px-4 py-6"
        >
          <div className="mx-auto max-w-3xl space-y-1">
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
                    onEdit={handleEditResend}
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
                         bg-nexus-card border border-nexus-border shadow-nexus-e2
                         text-nexus-muted hover:bg-nexus-elevated hover:text-nexus-text
                         transition-colors duration-micro ease-nexus z-10
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                         focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
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

        {/* Regenerate */}
        {!isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "assistant" && (
            <div className="relative z-10 flex justify-center pb-1">
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 rounded-full border border-nexus-border bg-nexus-card/80 px-3 py-1 text-xs text-nexus-muted shadow-nexus-hairline backdrop-blur-sm transition-colors duration-micro ease-nexus hover:border-nexus-accent-rim hover:bg-nexus-elevated hover:text-nexus-text focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
              >
                <RotateCcw className="h-3 w-3" />
                Regenerate
              </button>
            </div>
          )}

        {/* Input Bar */}
        <InputBar
          input={input}
          setInput={handleTextareaChange}
          onSend={handleSend}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
          showUpload={showUpload}
          setShowUpload={setShowUpload}
          sessionId={sessionId}
          onUploadComplete={() => loadMemories()}
          onVoiceText={(t) => setInput(t)}
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
  onOpenSettings,
  onExport,
  canExport,
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3
                    border-b border-nexus-border flex-shrink-0
                    bg-nexus-surface/80 backdrop-blur-xl
                    min-w-0 overflow-hidden"
    >
      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        {/* Mobile sidebar toggle */}
        <button
          onClick={onSidebarToggle}
          className="md:hidden p-1.5 rounded-lg hover:bg-nexus-elevated
                     text-nexus-muted hover:text-nexus-text
                     transition-colors duration-micro ease-nexus flex-shrink-0
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                     focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="relative w-8 h-8 rounded-xl bg-nexus-elevated
                          flex items-center justify-center flex-shrink-0
                          border border-nexus-accent-rim shadow-nexus-e2"
          >
            <Zap className="w-4 h-4 text-nexus-accent" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-semibold gradient-text tracking-tight whitespace-nowrap">
              Nexus Memory
            </span>
            <span className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-label text-nexus-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-nexus-success" />
              online
            </span>
          </div>
        </div>
      </div>

      {/* Right side — fixed width, no overflow */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {/* Memory toggle */}
        {sessionId && (
          <button
            onClick={() => setShowMemory(!showMemory)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5
                         rounded-lg text-[11px] font-medium uppercase tracking-label border
                         transition-colors duration-micro ease-nexus whitespace-nowrap
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                         focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg
                         ${
                           showMemory
                             ? "bg-nexus-accent-soft border-nexus-accent-rim text-nexus-accent-light"
                             : "border-transparent text-nexus-muted hover:text-nexus-text hover:bg-nexus-elevated"
                         }`}
          >
            <Brain className="w-3.5 h-3.5 flex-shrink-0" />
            {memoryCount > 0 && (
              <span
                className="bg-nexus-accent text-nexus-accent-ink
                               px-1.5 py-0.5 rounded-full text-[11px]
                               font-medium leading-none tracking-normal"
              >
                {memoryCount}
              </span>
            )}
            <span className="hidden sm:block">Memory</span>
          </button>
        )}

        {/* Export */}
        {canExport && (
          <button
            onClick={onExport}
            title="Export chat as Markdown"
            className="rounded-lg p-1.5 text-nexus-muted transition-colors duration-micro ease-nexus hover:bg-nexus-elevated hover:text-nexus-text focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="rounded-lg p-1.5 text-nexus-muted transition-colors duration-micro ease-nexus hover:bg-nexus-elevated hover:text-nexus-text focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
        >
          <Settings className="h-4 w-4" />
        </button>

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
  onStop,
  isStreaming,
  onKeyDown,
  textareaRef,
  showUpload,
  setShowUpload,
  sessionId,
  onUploadComplete,
  onVoiceText,
}) {
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef(null);

  const toggleVoice = () => {
    if (listening) {
      recognizerRef.current?.stop();
      return;
    }
    const rec = createRecognizer({
      onResult: (text) => onVoiceText?.(text),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (!rec) return;
    recognizerRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <div className="flex-shrink-0 border-t border-nexus-border bg-nexus-surface/80 backdrop-blur-xl px-4 py-4">
      <div className="max-w-3xl mx-auto">
        {/* Composer — graphite capsule whose rim warms to gold on focus */}
        <div
          className="group relative rounded-2xl border border-nexus-border bg-nexus-surface
                     shadow-nexus-e1 transition-all duration-panel ease-nexus
                     focus-within:border-nexus-accent-rim focus-within:shadow-nexus-glow"
        >
          <div className="flex items-end gap-1.5 rounded-2xl px-2 py-1.5">
            {/* Upload toggle */}
            <button
              onClick={() => setShowUpload(!showUpload)}
              disabled={!sessionId}
              title={sessionId ? "Upload document" : "Start a chat first"}
              className={`mb-1 flex-shrink-0 rounded-xl p-2 transition-colors duration-micro ease-nexus
                          disabled:cursor-not-allowed disabled:opacity-30
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                          focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface
                          ${
                            showUpload
                              ? "bg-nexus-accent-soft text-nexus-accent-light"
                              : "text-nexus-muted hover:bg-nexus-elevated hover:text-nexus-text"
                          }`}
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>

            {/* Voice input */}
            {speechSupported() && (
              <button
                onClick={toggleVoice}
                title={listening ? "Stop listening" : "Voice input"}
                className={`mb-1 flex-shrink-0 rounded-xl p-2 transition-colors duration-micro ease-nexus
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                            focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface ${
                  listening
                    ? "bg-nexus-error/15 text-nexus-error animate-pulse"
                    : "text-nexus-muted hover:bg-nexus-elevated hover:text-nexus-text"
                }`}
              >
                <Mic className="h-[18px] w-[18px]" />
              </button>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={setInput}
              onKeyDown={onKeyDown}
              placeholder="Ask anything…  ·  Enter to send, Shift+Enter for newline"
              rows={1}
              disabled={isStreaming}
              className="max-h-40 flex-1 resize-none border-0 bg-transparent py-2.5 text-sm
                         leading-relaxed text-nexus-text placeholder-nexus-muted
                         outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ minHeight: "44px" }}
            />

            {/* Char counter */}
            {input.length > 500 && (
              <span className="mb-2 self-center text-[11px] text-nexus-subtle">
                {input.length}
              </span>
            )}

            {/* Send / Stop button */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={isStreaming ? onStop : onSend}
              disabled={!isStreaming && !input.trim()}
              title={isStreaming ? "Stop generating" : "Send"}
              className="mb-0.5 flex-shrink-0 rounded-xl p-2.5 transition-colors duration-micro ease-nexus
                         bg-nexus-accent text-nexus-accent-ink
                         hover:bg-nexus-accent-light active:bg-nexus-accent-dark
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                         focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface
                         disabled:cursor-not-allowed disabled:bg-nexus-elevated disabled:text-nexus-subtle"
            >
              {isStreaming ? (
                <Square className="h-[18px] w-[18px]" fill="currentColor" />
              ) : (
                <Send className="h-[18px] w-[18px]" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="mt-2.5 hidden text-center text-[11px] text-nexus-subtle sm:block">
          Nexus Memory · lightning-fast responses · remembers you across sessions
        </p>
      </div>
    </div>
  );
}

// Animated ambient backdrop behind the welcome content — drifting aurora
// orbs and a masked grid for depth.
function WelcomeAmbient() {
  // Pure-CSS, GPU-composited orbs (see .aurora-orb in index.css) — no
  // per-frame JS and no blur re-rasterization, so scrolling stays smooth.
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="aurora-orb absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[rgba(201,162,39,0.07)] blur-[70px]"
        style={{ animation: "auroraDriftA 22s ease-in-out infinite" }}
      />
      <div
        className="aurora-orb absolute top-1/4 -right-28 h-80 w-80 rounded-full bg-[rgba(227,199,102,0.05)] blur-[80px]"
        style={{ animation: "auroraDriftB 26s ease-in-out infinite" }}
      />
      <div
        className="aurora-orb absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-[rgba(255,255,255,0.03)] blur-[70px]"
        style={{ animation: "auroraDriftC 24s ease-in-out infinite" }}
      />
      <div className="absolute inset-0 opacity-[0.10] [background:linear-gradient(rgba(201,162,39,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
    </div>
  );
}

function WelcomeScreen({ onSuggestion, status }) {
  const suggestions = [
    {
      icon: Sparkles,
      label: "Get started",
      prompt: "What's your name and what can you do?",
      action: "send",
      accent: "bg-nexus-elevated border border-nexus-border",
      glow: "group-hover:shadow-nexus-e2",
    },
    {
      icon: Brain,
      label: "Teach me a fact",
      prompt: "My favorite framework is FastAPI — remember that.",
      action: "send",
      accent: "bg-nexus-elevated border border-nexus-border",
      glow: "group-hover:shadow-nexus-e2",
    },
    {
      icon: FileText,
      label: "Chat with a PDF",
      prompt: "Upload a PDF and I'll answer questions from it.",
      action: "upload",
      accent: "bg-nexus-elevated border border-nexus-border",
      glow: "group-hover:shadow-nexus-e2",
    },
    {
      icon: History,
      label: "Recall memory",
      prompt: "What do you remember about me from before?",
      action: "send",
      accent: "bg-nexus-elevated border border-nexus-border",
      glow: "group-hover:shadow-nexus-e2",
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
          className="absolute -inset-4 rounded-full bg-[rgba(201,162,39,0.12)] blur-2xl will-change-[opacity]"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-3xl border border-nexus-accent-rim"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -inset-1 rounded-[1.4rem] border border-nexus-border"
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-nexus-elevated border border-nexus-accent-rim shadow-nexus-e3"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Zap className="h-9 w-9 text-nexus-accent" />
        </motion.div>
      </div>

      {/* Status pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-nexus-border bg-nexus-card px-3 py-1 shadow-nexus-e1"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nexus-success/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-nexus-success" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-label text-nexus-muted">
          {status?.llm?.status === "healthy"
            ? `${status.llm.provider} · ${status.llm.current_model}`
            : "Connecting…"}
        </span>
      </motion.div>

      <h1 className="text-3xl sm:text-4xl font-bold text-nexus-text mb-3 tracking-tight">
        Welcome to <span className="gradient-text">Nexus Memory</span>
      </h1>

      <p className="text-nexus-muted text-sm sm:text-base mb-6 leading-relaxed max-w-md mx-auto">
        An AI assistant that <span className="text-nexus-text">remembers you</span>,
        answers from <span className="text-nexus-text">your documents</span>, and
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
              className="inline-flex items-center gap-1.5 rounded-full border border-nexus-border bg-nexus-card px-3 py-1 text-[11px] uppercase tracking-label text-nexus-muted shadow-nexus-hairline backdrop-blur-sm"
            >
              <Icon className="h-3 w-3 text-nexus-subtle" />
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
              className="group relative overflow-hidden rounded-2xl border border-nexus-border
                         bg-nexus-card shadow-nexus-e1
                         transition-colors duration-panel ease-nexus
                         hover:border-nexus-accent-rim hover:bg-nexus-elevated
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                         focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
            >
              <div
                className={`relative flex h-full items-start gap-3 rounded-2xl
                            p-4 transition-shadow duration-panel ease-nexus ${s.glow}`}
              >
                {/* Shine sweep on hover */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {/* Icon tile */}
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center
                              rounded-xl ${s.accent} shadow-nexus-hairline
                              transition-colors duration-panel ease-nexus
                              group-hover:border-nexus-accent-rim`}
                >
                  <Icon className="h-4 w-4 text-nexus-muted transition-colors duration-panel ease-nexus group-hover:text-nexus-accent-light" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium uppercase tracking-label text-nexus-muted">
                      {s.label}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-nexus-subtle transition-all duration-panel ease-nexus group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-nexus-accent-light" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-nexus-text">
                    {s.prompt}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-7 text-[11px] text-nexus-subtle">
        Pick one to begin, or just start typing below ↓
      </p>
    </motion.div>
  );
}
