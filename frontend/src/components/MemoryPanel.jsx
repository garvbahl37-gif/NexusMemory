import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Tag, Plus, Trash2 } from "lucide-react";
import { addMemory, deleteMemory } from "../services/api";
import { format } from "date-fns";

const CATEGORY_OPTIONS = [
  "general",
  "technical",
  "preference",
  "professional",
  "goal",
];

const categoryStyles = {
  technical: "text-blue-400 bg-blue-950/50 border-blue-800/40",
  preference: "text-purple-400 bg-purple-950/50 border-purple-800/40",
  professional: "text-emerald-400 bg-emerald-950/50 border-emerald-800/40",
  goal: "text-amber-400 bg-amber-950/50 border-amber-800/40",
  general: "text-slate-400 bg-slate-800/50 border-slate-700/40",
};

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

  const handleAddMemory = async () => {
    if (!newFact.trim() || !sessionId) return;
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col bg-nexus-surface border-l border-nexus-border"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3
                      border-b border-nexus-border flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-nexus-accent" />
          <span className="text-sm font-semibold text-nexus-text">
            Memory Store
          </span>
          <span
            className="text-xs bg-nexus-accent/20 text-nexus-accent-light
                           px-1.5 py-0.5 rounded-full font-medium"
          >
            {memories.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-nexus-card text-nexus-muted
                     hover:text-nexus-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Add Memory Button */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2
                     rounded-lg border border-dashed border-nexus-border
                     text-xs text-nexus-muted hover:text-nexus-text
                     hover:border-nexus-accent/50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Memory Manually
        </button>

        {/* Add Form */}
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
                placeholder="Enter a fact to remember..."
                rows={3}
                className="nexus-input w-full text-xs resize-none"
              />
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="nexus-input flex-1 text-xs"
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
                  className="nexus-button-primary text-xs px-3"
                >
                  {isAdding ? "..." : "Save"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {memories.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-10 h-10 text-nexus-border mx-auto mb-3" />
            <p className="text-sm text-nexus-muted">No memories yet</p>
            <p className="text-xs text-nexus-muted mt-1">
              Chat naturally and memories will form automatically.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {memories.map((memory, index) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                className="nexus-card p-3 group space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-nexus-text leading-relaxed flex-1">
                    {memory.fact}
                  </p>
                  <button
                    onClick={() => handleDeleteMemory(memory.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity
                               p-1 rounded hover:bg-nexus-surface text-nexus-muted
                               hover:text-nexus-error flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-xs
                                    px-1.5 py-0.5 rounded-full border font-medium
                                    ${categoryStyles[memory.category] || categoryStyles.general}`}
                  >
                    <Tag className="w-2 h-2" />
                    {memory.category}
                  </span>
                  <span className="text-xs text-nexus-muted">
                    {format(new Date(memory.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
