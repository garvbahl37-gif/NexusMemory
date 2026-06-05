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

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput("");

    // Auto-resize textarea back to single line
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // If no session exists yet, create one NOW and pass it directly
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = onNewSession();
      console.log("Created new session:", activeSessionId);
    }

    // Pass activeSessionId as override so sendMessage uses it immediately
    // (React state update for sessionId may not have propagated yet)
    await sendMessage(message, selectedModel, activeSessionId);

    // Refresh memories after a short delay
    setTimeout(() => loadMemories(), 2500);
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
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <WelcomeScreen />
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
          Nexus Memory uses local AI via Ollama — your data stays private.
        </p>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  const suggestions = [
    "What's your name and what can you do?",
    "My favorite framework is FastAPI — remember that.",
    "Upload a PDF and I'll answer questions from it.",
    "What do you remember about me from before?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-lg w-full"
    >
      <div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                      flex items-center justify-center mx-auto mb-6 shadow-2xl
                      shadow-indigo-500/20"
      >
        <Zap className="w-8 h-8 text-white" />
      </div>

      <h1 className="text-2xl font-bold text-nexus-text mb-2">
        Welcome to <span className="gradient-text">Nexus Memory</span>
      </h1>

      <p className="text-nexus-muted text-sm mb-8 leading-relaxed">
        A local AI assistant that remembers you across sessions, answers
        questions from your documents, and runs entirely on your machine.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((suggestion, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="nexus-card p-3 text-left cursor-default
                       hover:border-nexus-accent/40 transition-colors"
          >
            <p className="text-xs text-nexus-muted leading-relaxed">
              {suggestion}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
