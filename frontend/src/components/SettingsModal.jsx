import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, Sparkles, Volume2 } from "lucide-react";

const DEFAULTS = {
  temperature: 0.7,
  systemPrompt: "",
  autoSpeak: false,
};

const PERSONAS = [
  { name: "Default", prompt: "" },
  {
    name: "Concise",
    prompt:
      "You are concise and direct. Answer in as few words as possible while staying correct. Prefer bullet points.",
  },
  {
    name: "Mentor",
    prompt:
      "You are a patient senior engineer mentoring a junior. Explain the why, give examples, and suggest best practices.",
  },
  {
    name: "Creative",
    prompt:
      "You are imaginative and playful. Use vivid language and think outside the box while staying helpful.",
  },
];

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("nexus_settings") || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export default function SettingsModal({ open, onClose, onChange }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    if (open) setSettings(loadSettings());
  }, [open]);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem("nexus_settings", JSON.stringify(next));
    onChange?.(next);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-nexus-border bg-nexus-surface shadow-2xl shadow-black/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-nexus-border px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-nexus-accent" />
                <span className="text-sm font-semibold text-nexus-text">
                  Settings
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {/* Temperature */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-nexus-text">
                    Creativity (temperature)
                  </label>
                  <span className="font-mono text-xs text-nexus-accent-light">
                    {settings.temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) =>
                    update({ temperature: parseFloat(e.target.value) })
                  }
                  className="w-full accent-nexus-accent"
                />
                <div className="mt-1 flex justify-between text-[10px] text-nexus-muted">
                  <span>Precise</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Persona */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-nexus-text">
                  <Sparkles className="h-3.5 w-3.5 text-nexus-accent-light" />
                  Persona
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => update({ systemPrompt: p.prompt })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        settings.systemPrompt === p.prompt
                          ? "border-nexus-accent/50 bg-nexus-accent/10 text-nexus-accent-light"
                          : "border-nexus-border/70 text-nexus-muted hover:text-nexus-text"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => update({ systemPrompt: e.target.value })}
                  placeholder="Custom system instructions (optional)…"
                  rows={3}
                  className="nexus-input w-full resize-none text-xs"
                />
              </div>

              {/* Auto-speak */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-medium text-nexus-text">
                  <Volume2 className="h-3.5 w-3.5 text-nexus-accent-light" />
                  Auto-speak replies
                </label>
                <button
                  onClick={() => update({ autoSpeak: !settings.autoSpeak })}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    settings.autoSpeak ? "bg-nexus-accent" : "bg-nexus-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                      settings.autoSpeak ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
