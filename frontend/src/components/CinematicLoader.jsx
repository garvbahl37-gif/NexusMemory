import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

// Boot-log lines, revealed as the progress bar crosses each threshold.
const BOOT_LINES = [
  { at: 5, text: "› booting nexus kernel v1.0 ..." },
  { at: 19, text: "› mounting memory matrix  [chromadb] ........ OK" },
  { at: 34, text: "› linking neural core → groq/llama-3.3-70b .. OK" },
  { at: 50, text: "› calibrating embedding field [minilm-l6] .. OK" },
  { at: 66, text: "› restoring session continuum .............. OK" },
  { at: 82, text: "› decrypting long-term memories ............ OK" },
  { at: 97, text: "› all systems nominal" },
];

// Big status word shown under the title, swapped as progress advances.
const STATUS = [
  [0, "INITIALIZING NEURAL CORE"],
  [25, "LOADING MEMORY MATRIX"],
  [50, "ESTABLISHING UPLINK"],
  [75, "CALIBRATING SYNAPSES"],
  [96, "ENTERING NEXUS"],
];

const TITLE = "NEXUS MEMORY";

export default function CinematicLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);

  // Pre-compute a drifting particle field once.
  const particles = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 2.5 + 0.6,
        delay: Math.random() * 4,
        duration: Math.random() * 5 + 4,
        drift: (Math.random() - 0.5) * 60,
        hue: Math.random() > 0.5 ? "#818cf8" : "#22d3ee",
      })),
    [],
  );

  // Drive the boot progress, then hand off to the app.
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 2.5 + 0.8;
      if (p >= 100) {
        p = 100;
        setProgress(100);
        clearInterval(id);
        setTimeout(() => onComplete?.(), 700);
      } else {
        setProgress(p);
      }
    }, 80);
    return () => clearInterval(id);
  }, [onComplete]);

  const status =
    STATUS.filter(([t]) => progress >= t).slice(-1)[0]?.[1] ?? STATUS[0][1];
  const visibleLines = BOOT_LINES.filter((l) => progress >= l.at);

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#05050a]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.12, filter: "blur(14px)" }}
      transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
    >
      {/* Rotating conic energy glow */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, #6366f1, transparent, #06b6d4, transparent, #8b5cf6, transparent)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      {/* Radial vignette + base darkening */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#05050a_70%)]" />

      {/* Perspective grid floor */}
      <div className="cine-grid absolute inset-x-0 bottom-0 h-1/2" />

      {/* Drifting particle field */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: -10,
            width: p.size,
            height: p.size,
            background: p.hue,
            boxShadow: `0 0 ${p.size * 4}px ${p.hue}`,
          }}
          animate={{ y: [-0, -window.innerHeight - 40], x: p.drift, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Cinematic letterbox bars */}
      <motion.div
        className="absolute inset-x-0 top-0 z-30 bg-black"
        initial={{ height: "50vh" }}
        animate={{ height: "8vh" }}
        transition={{ duration: 1.1, ease: [0.7, 0, 0.3, 1] }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 z-30 bg-black"
        initial={{ height: "50vh" }}
        animate={{ height: "8vh" }}
        transition={{ duration: 1.1, ease: [0.7, 0, 0.3, 1] }}
      />

      {/* ── Center stage ─────────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        {/* Core + orbiting rings */}
        <div className="relative mb-10 flex h-44 w-44 items-center justify-center">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-nexus-accent/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
          </motion.div>
          {/* Mid ring (reverse) */}
          <motion.div
            className="absolute inset-4 rounded-full border border-cyan-400/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-nexus-accent-light shadow-[0_0_12px_#818cf8]" />
          </motion.div>
          {/* Inner dashed ring */}
          <motion.div
            className="absolute inset-9 rounded-full border-2 border-dashed border-purple-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          {/* Pulsing core */}
          <motion.div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-nexus-accent via-purple-500 to-cyan-500"
            animate={{
              boxShadow: [
                "0 0 24px 4px rgba(99,102,241,0.5)",
                "0 0 60px 12px rgba(34,211,238,0.7)",
                "0 0 24px 4px rgba(99,102,241,0.5)",
              ],
              scale: [1, 1.07, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="h-9 w-9 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          </motion.div>
        </div>

        {/* Title — per-letter reveal */}
        <div className="flex flex-wrap justify-center">
          {TITLE.split("").map((ch, i) => (
            <motion.span
              key={i}
              className="gradient-text text-4xl font-bold tracking-[0.18em] sm:text-6xl"
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.6 + i * 0.07, duration: 0.5, ease: "easeOut" }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </div>

        {/* Status word */}
        <div className="mt-4 h-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              className="font-mono text-xs tracking-[0.4em] text-cyan-300/80 sm:text-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {status}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="mt-10 w-72 max-w-[80vw] sm:w-96">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-nexus-muted">
            <span>SYSTEM BOOT</span>
            <span className="text-nexus-accent-light">
              {String(Math.floor(progress)).padStart(3, "0")}%
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-nexus-accent via-purple-400 to-cyan-400"
              style={{ width: `${progress}%` }}
            />
            <div
              className="cine-shimmer absolute inset-y-0 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Boot log */}
          <div className="mt-5 h-28 space-y-1 overflow-hidden font-mono text-[10px] leading-relaxed text-nexus-muted/70 sm:text-[11px]">
            {visibleLines.map((l) => (
              <motion.div
                key={l.at}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                {l.text}
              </motion.div>
            ))}
            {progress < 100 && (
              <span className="inline-block h-3 w-2 animate-pulse bg-cyan-400/70 align-middle" />
            )}
          </div>
        </div>
      </div>

      {/* Scanline + grain overlays */}
      <div className="cine-scan pointer-events-none absolute inset-0 z-40" />
      <div className="cine-grain pointer-events-none absolute inset-0 z-40 opacity-[0.05]" />

      {/* Skip */}
      <button
        onClick={() => onComplete?.()}
        className="absolute bottom-[9vh] right-6 z-50 font-mono text-[11px] tracking-widest text-nexus-muted/60 transition-colors hover:text-cyan-300"
      >
        SKIP ▸
      </button>
    </motion.div>
  );
}
