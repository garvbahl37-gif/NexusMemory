import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  X,
  Tag,
  Plus,
  Trash2,
  Pencil,
  Check,
  Search,
  MessageSquareQuote,
} from "lucide-react";
import { addMemory, deleteMemory, updateMemory } from "../services/api";
import { format } from "date-fns";

const CATEGORY_OPTIONS = [
  "general",
  "technical",
  "preference",
  "professional",
  "goal",
];

/* Low-chroma editorial category hues — never neon, never gold.
   10% tint background · hue as text · 1px border at 25% opacity. */
const categoryStyles = {
  technical:
    "text-[#8FA3A0] bg-[rgba(143,163,160,0.10)] border-[rgba(143,163,160,0.25)]",
  professional:
    "text-[#A89478] bg-[rgba(168,148,120,0.10)] border-[rgba(168,148,120,0.25)]",
  personal:
    "text-[#B08D86] bg-[rgba(176,141,134,0.10)] border-[rgba(176,141,134,0.25)]",
  preference:
    "text-[#93968C] bg-[rgba(147,150,140,0.10)] border-[rgba(147,150,140,0.25)]",
  goal: "text-[#9E8F6B] bg-[rgba(158,143,107,0.10)] border-[rgba(158,143,107,0.25)]",
  general:
    "text-[#8A878D] bg-[rgba(138,135,141,0.10)] border-[rgba(138,135,141,0.25)]",
};

/* Shared focus treatment — 2px gold ring, offset onto the local surface. */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface";
const focusRingOnCard =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-card";

export default function MemoryPanel({
  sessionId,
  memories,
  onClose,
  onMemoryChange,
}) {
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  // Inline editing
  const [editingId, setEditingId] = useState(null);
  const [editFact, setEditFact] = useState("");
  const [editCategory, setEditCategory] = useState("general");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memories.filter((m) => {
      if (filter !== "all" && m.category !== filter) return false;
      if (q && !m.fact.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [memories, query, filter]);

  const handleAddMemory = async () => {
    if (!newFact.trim()) return;
    setIsAdding(true);
    try {
      await addMemory({
        session_id: sessionId,
        fact: newFact.trim(),
        category: newCategory,
      });
      setNewFact("");
      setShowAddForm(false);
      onMemoryChange?.();
    } catch (err) {
      console.error("Failed to add memory:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    try {
      await deleteMemory(memoryId);
      onMemoryChange?.();
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  const startEdit = (memory) => {
    setEditingId(memory.id);
    setEditFact(memory.fact);
    setEditCategory(memory.category || "general");
  };

  const saveEdit = async () => {
    if (!editFact.trim()) return;
    try {
      await updateMemory(editingId, {
        fact: editFact.trim(),
        category: editCategory,
      });
      setEditingId(null);
      onMemoryChange?.();
    } catch (err) {
      console.error("Failed to update memory:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col bg-nexus-surface border-l border-nexus-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-nexus-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Brand mark: graphite tile + gold glyph + gold rim */}
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-nexus-elevated border border-nexus-accent-rim shadow-nexus-e1">
            <Brain className="w-3.5 h-3.5 text-nexus-accent" />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-label text-nexus-muted">
            Memory
          </span>
          <span className="text-[10px] font-medium tabular-nums bg-nexus-accent-soft text-nexus-accent-light border border-nexus-accent-rim px-1.5 py-0.5 rounded-full">
            {memories.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg hover:bg-nexus-elevated text-nexus-subtle hover:text-nexus-text transition-colors duration-micro ease-nexus active:scale-[0.98] ${focusRing}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search + filter */}
      <div className="px-4 pt-3 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nexus-subtle pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories…"
            className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-nexus-card border border-nexus-border shadow-nexus-e1 text-nexus-text placeholder:text-nexus-muted transition-colors duration-micro ease-nexus focus:border-nexus-accent-rim ${focusRing}`}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {["all", ...CATEGORY_OPTIONS].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-label transition-colors duration-micro ease-nexus active:scale-[0.98] ${focusRing} ${
                filter === c
                  ? "border-nexus-accent-rim bg-nexus-accent-soft text-nexus-accent-light"
                  : "border-nexus-border bg-transparent text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Add memory */}
      <div className="px-4 pt-2 pb-2 flex-shrink-0">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-nexus-border text-xs text-nexus-muted hover:text-nexus-text hover:border-nexus-accent-rim hover:bg-nexus-accent-soft transition-colors duration-micro ease-nexus active:scale-[0.98] ${focusRing}`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Memory Manually
        </button>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2 overflow-hidden"
            >
              <textarea
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="Enter a fact to remember…"
                rows={3}
                className={`w-full text-xs resize-none px-3 py-2 rounded-xl bg-nexus-card border border-nexus-border shadow-nexus-e1 text-nexus-text placeholder:text-nexus-muted leading-relaxed transition-colors duration-micro ease-nexus focus:border-nexus-accent-rim ${focusRing}`}
              />
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`flex-1 text-xs px-2.5 py-2 rounded-xl bg-nexus-card border border-nexus-border shadow-nexus-e1 text-nexus-text transition-colors duration-micro ease-nexus hover:bg-nexus-elevated focus:border-nexus-accent-rim ${focusRing}`}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddMemory}
                  disabled={!newFact.trim() || isAdding}
                  className={`text-xs px-3 py-2 rounded-xl font-medium bg-nexus-accent text-nexus-accent-ink transition-colors duration-micro ease-nexus hover:bg-nexus-accent-light active:bg-nexus-accent-dark active:scale-[0.98] disabled:bg-nexus-elevated disabled:text-nexus-subtle disabled:border disabled:border-nexus-border disabled:shadow-nexus-e1 disabled:cursor-not-allowed ${focusRing}`}
                >
                  {isAdding ? "..." : "Save"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-10 h-10 text-nexus-subtle/60 mx-auto mb-3" />
            <p className="text-sm font-semibold tracking-tight text-nexus-text">
              {memories.length === 0 ? "No memories yet" : "No matches"}
            </p>
            <p className="text-xs text-nexus-muted mt-1 leading-relaxed">
              {memories.length === 0
                ? "Chat naturally and memories will form automatically."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((memory, index) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                className="p-3 group space-y-2 rounded-xl bg-nexus-card border border-nexus-border shadow-nexus-e1 hover:bg-nexus-elevated hover:shadow-nexus-e2 transition-colors duration-micro ease-nexus"
              >
                {editingId === memory.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editFact}
                      onChange={(e) => setEditFact(e.target.value)}
                      rows={3}
                      className={`w-full text-xs resize-none px-3 py-2 rounded-xl bg-nexus-surface border border-nexus-border shadow-nexus-e1 text-nexus-text placeholder:text-nexus-muted leading-relaxed transition-colors duration-micro ease-nexus focus:border-nexus-accent-rim ${focusRingOnCard}`}
                    />
                    <div className="flex gap-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className={`flex-1 text-xs px-2.5 py-2 rounded-xl bg-nexus-surface border border-nexus-border shadow-nexus-e1 text-nexus-text transition-colors duration-micro ease-nexus hover:bg-nexus-elevated focus:border-nexus-accent-rim ${focusRingOnCard}`}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={saveEdit}
                        disabled={!editFact.trim()}
                        className={`text-xs px-3 py-2 rounded-xl font-medium flex items-center gap-1 bg-nexus-accent text-nexus-accent-ink transition-colors duration-micro ease-nexus hover:bg-nexus-accent-light active:bg-nexus-accent-dark active:scale-[0.98] disabled:bg-nexus-elevated disabled:text-nexus-subtle disabled:border disabled:border-nexus-border disabled:shadow-nexus-e1 disabled:cursor-not-allowed ${focusRingOnCard}`}
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={`text-xs px-2 py-2 rounded-xl bg-transparent text-nexus-muted transition-colors duration-micro ease-nexus hover:bg-nexus-surface hover:text-nexus-text active:scale-[0.98] ${focusRingOnCard}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-nexus-text leading-relaxed flex-1">
                        {memory.fact}
                      </p>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-micro ease-nexus flex-shrink-0">
                        <button
                          onClick={() => startEdit(memory)}
                          className={`p-1 rounded-md text-nexus-subtle transition-colors duration-micro ease-nexus hover:bg-nexus-surface hover:text-nexus-text active:scale-[0.98] ${focusRingOnCard}`}
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(memory.id)}
                          className={`p-1 rounded-md text-nexus-subtle transition-colors duration-micro ease-nexus hover:bg-nexus-surface hover:text-nexus-error active:scale-[0.98] ${focusRingOnCard}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Provenance — why this was remembered */}
                    {memory.source_message && (
                      <div
                        className="flex items-start gap-1.5 text-[11px] leading-relaxed text-nexus-muted italic border-l border-nexus-border pl-2"
                        title="The message this memory came from"
                      >
                        <MessageSquareQuote className="w-3 h-3 mt-0.5 flex-shrink-0 text-nexus-subtle" />
                        <span className="line-clamp-2">
                          “{memory.source_message}”
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-label ${
                          categoryStyles[memory.category] ||
                          categoryStyles.general
                        }`}
                      >
                        <Tag className="w-2 h-2" />
                        {memory.category}
                      </span>
                      <span className="text-[11px] tabular-nums text-nexus-subtle">
                        {format(new Date(memory.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
