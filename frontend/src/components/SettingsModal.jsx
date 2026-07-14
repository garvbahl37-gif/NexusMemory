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
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        >
          <div
            className="absolute inset-0 bg-black/[0.72] backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-nexus-border bg-nexus-elevated shadow-nexus-e3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-nexus-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-nexus-accent-rim bg-nexus-card shadow-nexus-hairline">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-nexus-accent" />
                </span>
                <span className="text-sm font-semibold tracking-tight text-nexus-text">
                  Settings
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-nexus-muted transition-colors duration-micro ease-nexus hover:bg-nexus-card hover:text-nexus-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {/* Temperature */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="nexus-label text-[11px] font-medium uppercase tracking-label text-nexus-muted">
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
                  className="w-full cursor-pointer accent-nexus-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-elevated"
                />
                <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-label text-nexus-subtle">
                  <span>Precise</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Persona */}
              <div>
                <label className="nexus-label mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-label text-nexus-muted">
                  <Sparkles className="h-3.5 w-3.5 text-nexus-subtle" />
                  Persona
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => update({ systemPrompt: p.prompt })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-micro ease-nexus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-elevated ${
                        settings.systemPrompt === p.prompt
                          ? "border-nexus-accent-rim bg-nexus-accent-soft text-nexus-accent-light"
                          : "border-nexus-border bg-nexus-card text-nexus-muted hover:bg-nexus-elevated hover:text-nexus-text"
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
                  className="nexus-input w-full resize-none rounded-xl border-nexus-border bg-nexus-card text-xs leading-relaxed shadow-nexus-e1 transition-all duration-micro ease-nexus focus:border-nexus-accent-rim"
                />
              </div>

              {/* Auto-speak */}
              <div className="flex items-center justify-between">
                <label className="nexus-label flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-label text-nexus-muted">
                  <Volume2 className="h-3.5 w-3.5 text-nexus-subtle" />
                  Auto-speak replies
                </label>
                <button
                  onClick={() => update({ autoSpeak: !settings.autoSpeak })}
                  className={`relative h-5 w-9 rounded-full border transition-colors duration-micro ease-nexus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-elevated ${
                    settings.autoSpeak
                      ? "border-nexus-accent-dark bg-nexus-accent"
                      : "border-nexus-border bg-nexus-card"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-micro ease-nexus ${
                      settings.autoSpeak
                        ? "left-[19px] bg-nexus-accent-ink"
                        : "left-0.5 bg-nexus-subtle"
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
