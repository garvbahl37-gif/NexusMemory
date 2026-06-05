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
    technical: "text-blue-400 bg-blue-950/50 border-blue-800/40",
    preference: "text-purple-400 bg-purple-950/50 border-purple-800/40",
    professional: "text-emerald-400 bg-emerald-950/50 border-emerald-800/40",
    goal: "text-amber-400 bg-amber-950/50 border-amber-800/40",
    general: "text-slate-400 bg-slate-800/50 border-slate-700/40",
  };

  return (
    <div className="flex flex-col h-full bg-nexus-surface border-r border-nexus-border">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-nexus-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
                          flex items-center justify-center shadow-lg"
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm gradient-text">
              Nexus Memory
            </span>
            <p className="text-xs text-nexus-muted leading-none mt-0.5">
              Local AI Assistant
            </p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-nexus-card text-nexus-muted
                       hover:text-nexus-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── New Chat Button ─────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5
                     rounded-lg bg-nexus-accent/10 border border-nexus-accent/30
                     text-nexus-accent-light text-sm font-medium
                     hover:bg-nexus-accent/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex px-3 gap-1 mb-2 flex-shrink-0">
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
                         rounded-lg text-xs font-medium transition-all duration-200
                         ${
                           activeTab === tab.id
                             ? "bg-nexus-card text-nexus-text border border-nexus-border"
                             : "text-nexus-muted hover:text-nexus-text"
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
              {sessions.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="w-8 h-8 text-nexus-border mx-auto mb-2" />
                  <p className="text-xs text-nexus-muted">
                    No conversations yet.
                  </p>
                  <p className="text-xs text-nexus-muted mt-1">
                    Start chatting below!
                  </p>
                </div>
              ) : (
                sessions.map((session, index) => (
                  <motion.div
                    key={session.session_id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSelectSession(session.session_id)}
                    className={`group flex items-start gap-2.5 px-3 py-2.5
                                 rounded-lg cursor-pointer transition-all duration-150
                                 ${
                                   session.session_id === currentSessionId
                                     ? "bg-nexus-accent/10 border border-nexus-accent/30"
                                     : "hover:bg-nexus-card border border-transparent"
                                 }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-nexus-muted flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium truncate leading-snug
                                     ${
                                       session.session_id === currentSessionId
                                         ? "text-nexus-accent-light"
                                         : "text-nexus-text"
                                     }`}
                      >
                        {session.title}
                      </p>
                      <p className="text-xs text-nexus-muted mt-0.5">
                        {format(new Date(session.updated_at), "MMM d, HH:mm")}
                      </p>
                    </div>

                    <button
                      onClick={(e) =>
                        handleDeleteSession(e, session.session_id)
                      }
                      className="opacity-0 group-hover:opacity-100 transition-opacity
                                 p-1 rounded hover:bg-red-950/60 text-nexus-muted
                                 hover:text-red-400 flex-shrink-0"
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
                className="w-full text-xs text-nexus-muted hover:text-nexus-text
                           py-1.5 rounded-lg hover:bg-nexus-card transition-colors
                           disabled:opacity-50 mb-1"
              >
                {loadingMemories ? "Loading..." : "↻ Refresh memories"}
              </button>

              {!currentSessionId ? (
                <div className="text-center py-10">
                  <Brain className="w-8 h-8 text-nexus-border mx-auto mb-2" />
                  <p className="text-xs text-nexus-muted">
                    Select a chat to view memories.
                  </p>
                </div>
              ) : memories.length === 0 ? (
                <div className="text-center py-10">
                  <Brain className="w-8 h-8 text-nexus-border mx-auto mb-2" />
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
                    className="nexus-card p-2.5 space-y-1.5"
                  >
                    <p className="text-xs text-nexus-text leading-relaxed">
                      {memory.fact}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5
                                     rounded-full border font-medium
                                     ${categoryStyles[memory.category] || categoryStyles.general}`}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {memory.category}
                      </span>
                      <span className="text-xs text-nexus-muted">
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
          <div className="w-1.5 h-1.5 rounded-full bg-nexus-success animate-pulse-slow" />
          <span className="text-xs text-nexus-muted">Ollama connected</span>
        </div>
      </div>
    </div>
  );
}
