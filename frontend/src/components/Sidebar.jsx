import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  Trash2,
  Brain,
  FileText,
  Zap,
  X,
  Tag,
  Search,
} from "lucide-react";
import { getSessions, deleteSession, getMemories } from "../services/api";
import { format } from "date-fns";

export default function Sidebar({
  currentSessionId,
  onNewChat,
  onSelectSession,
  onClose,
  isMobile = false,
}) {
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("chats");
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loadingMemories, setLoadingMemories] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [currentSessionId]);

  useEffect(() => {
    if (currentSessionId && activeTab === "memory") {
      loadMemories();
    }
  }, [currentSessionId, activeTab]);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const loadMemories = async () => {
    if (!currentSessionId) return;
    setLoadingMemories(true);
    try {
      const data = await getMemories(currentSessionId);
      setMemories(data.memories || []);
      setMemoryCount(data.total || 0);
    } catch (err) {
      console.error("Failed to load memories:", err);
    } finally {
      setLoadingMemories(false);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (sessionId === currentSessionId) {
        onNewChat();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const categoryStyles = {
    technical: "text-[#8FA3A0] bg-[#8FA3A0]/10 border-[#8FA3A0]/25",
    preference: "text-[#93968C] bg-[#93968C]/10 border-[#93968C]/25",
    professional: "text-[#A89478] bg-[#A89478]/10 border-[#A89478]/25",
    personal: "text-[#B08D86] bg-[#B08D86]/10 border-[#B08D86]/25",
    goal: "text-[#9E8F6B] bg-[#9E8F6B]/10 border-[#9E8F6B]/25",
    general: "text-nexus-muted bg-nexus-muted/10 border-nexus-muted/25",
  };

  return (
    <div className="flex flex-col h-full bg-nexus-surface border border-nexus-border rounded-2xl overflow-hidden shadow-nexus-e2">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-nexus-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl bg-nexus-elevated
                          flex items-center justify-center shadow-nexus-e1 ring-1 ring-nexus-accent-rim"
          >
            <Zap className="w-4 h-4 text-nexus-accent" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight gradient-text">
              Nexus Memory
            </span>
            <p className="text-[11px] text-nexus-muted leading-none mt-0.5">
              Local AI Assistant
            </p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-nexus-elevated text-nexus-muted
                       hover:text-nexus-text transition-colors duration-micro ease-nexus
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                       focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── New Chat Button ─────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewChat}
          className="group w-full flex items-center justify-center gap-2 px-3 py-2.5
                     rounded-xl bg-nexus-accent
                     text-nexus-accent-ink text-sm font-medium
                     shadow-nexus-e1
                     hover:bg-nexus-accent-light active:bg-nexus-accent-dark
                     transition-colors duration-micro ease-nexus
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                     focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface"
        >
          <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          New Chat
        </motion.button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="mx-3 mb-3 flex gap-1 rounded-xl border border-nexus-border bg-nexus-card p-1 flex-shrink-0 shadow-nexus-e1">
        {[
          { id: "chats", icon: MessageSquare, label: "Chats" },
          {
            id: "memory",
            icon: Brain,
            label: memoryCount > 0 ? `Memory (${memoryCount})` : "Memory",
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5
                         rounded-lg text-[11px] font-medium uppercase tracking-label border-b-2
                         transition-colors duration-micro ease-nexus focus:outline-none
                         focus-visible:ring-2 focus-visible:ring-nexus-accent
                         focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface
                         ${
                           activeTab === tab.id
                             ? "bg-nexus-elevated text-nexus-text shadow-nexus-e1 border-nexus-accent"
                             : "border-transparent text-nexus-muted hover:text-nexus-text"
                         }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Content ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <AnimatePresence mode="wait">
          {/* Chats Tab */}
          {activeTab === "chats" && (
            <motion.div
              key="chats"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="space-y-1"
            >
              {/* Search conversations */}
              {sessions.length > 0 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-subtle" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search chats…"
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg
                               bg-nexus-card border border-nexus-border shadow-nexus-e1
                               text-nexus-text placeholder-nexus-muted
                               transition-colors duration-micro ease-nexus
                               focus:outline-none focus:border-nexus-accent-rim
                               focus-visible:ring-2 focus-visible:ring-nexus-accent
                               focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface"
                  />
                </div>
              )}

              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-nexus-border bg-nexus-card shadow-nexus-e1">
                    <MessageSquare className="w-5 h-5 text-nexus-subtle" />
                  </div>
                  <p className="text-xs font-medium text-nexus-text">
                    No conversations yet
                  </p>
                  <p className="text-[11px] text-nexus-muted mt-1">
                    Start chatting below to begin
                  </p>
                </div>
              ) : (
                sessions
                  .filter((s) =>
                    (s.title || "").toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((session, index) => (
                  <motion.div
                    key={session.session_id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSelectSession(session.session_id)}
                    className={`group flex items-start gap-2.5 px-3 py-2.5
                                 rounded-lg cursor-pointer border-l-2
                                 transition-colors duration-micro ease-nexus
                                 ${
                                   session.session_id === currentSessionId
                                     ? "bg-nexus-accent-soft border-nexus-accent"
                                     : "hover:bg-nexus-card border-transparent"
                                 }`}
                  >
                    <MessageSquare
                      className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                        session.session_id === currentSessionId
                          ? "text-nexus-accent"
                          : "text-nexus-subtle"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium truncate leading-snug
                                     transition-colors duration-micro ease-nexus
                                     ${
                                       session.session_id === currentSessionId
                                         ? "text-nexus-text"
                                         : "text-nexus-muted group-hover:text-nexus-text"
                                     }`}
                      >
                        {session.title}
                      </p>
                      <p className="text-[11px] text-nexus-subtle mt-0.5">
                        {format(new Date(session.updated_at), "MMM d, HH:mm")}
                      </p>
                    </div>

                    <button
                      onClick={(e) =>
                        handleDeleteSession(e, session.session_id)
                      }
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                                 p-1 rounded text-nexus-subtle flex-shrink-0
                                 hover:bg-nexus-error/10 hover:text-nexus-error
                                 transition-all duration-micro ease-nexus
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                                 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface"
                      title="Delete session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Memory Tab */}
          {activeTab === "memory" && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-1.5"
            >
              {/* Refresh button */}
              <button
                onClick={loadMemories}
                disabled={loadingMemories}
                className="w-full text-[11px] uppercase tracking-label font-medium
                           text-nexus-muted hover:text-nexus-text
                           py-1.5 rounded-lg hover:bg-nexus-card
                           transition-colors duration-micro ease-nexus
                           disabled:opacity-50 mb-1
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent
                           focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface"
              >
                {loadingMemories ? "Loading..." : "↻ Refresh memories"}
              </button>

              {!currentSessionId ? (
                <div className="text-center py-10">
                  <Brain className="w-8 h-8 text-nexus-subtle mx-auto mb-2" />
                  <p className="text-xs text-nexus-muted">
                    Select a chat to view memories.
                  </p>
                </div>
              ) : memories.length === 0 ? (
                <div className="text-center py-10">
                  <Brain className="w-8 h-8 text-nexus-subtle mx-auto mb-2" />
                  <p className="text-xs text-nexus-muted">No memories yet.</p>
                  <p className="text-xs text-nexus-muted mt-1">
                    Chat to build memory!
                  </p>
                </div>
              ) : (
                memories.map((memory, index) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-nexus-card border border-nexus-border rounded-xl
                               shadow-nexus-e1 hover:bg-nexus-elevated hover:shadow-nexus-e2
                               transition-colors duration-micro ease-nexus
                               p-2.5 space-y-1.5"
                  >
                    <p className="text-xs text-nexus-text leading-relaxed">
                      {memory.fact}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5
                                     rounded-full border font-medium uppercase tracking-label
                                     ${categoryStyles[memory.category] || categoryStyles.general}`}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {memory.category}
                      </span>
                      <span className="text-[11px] text-nexus-subtle">
                        {format(new Date(memory.created_at), "MMM d")}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer Status ───────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-nexus-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nexus-success/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-nexus-success" />
          </span>
          <span className="text-[11px] uppercase tracking-label font-medium text-nexus-muted">
            Online · <span className="text-nexus-text">Groq Llama 3.3</span>
          </span>
        </div>
      </div>
    </div>
  );
}
