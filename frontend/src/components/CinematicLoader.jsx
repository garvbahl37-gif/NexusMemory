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
        hue: Math.random() > 0.5 ? "#C9A227" : "#D8D5D0",
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
      className="fixed inset-0 z-[100] overflow-hidden bg-nexus-bg"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.12, filter: "blur(14px)" }}
      transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
    >
      {/* Rotating conic sweep — champagne + warm graphite, no hue outside the palette */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 opacity-30"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, rgba(201,162,39,0.30), transparent, rgba(255,255,255,0.05), transparent, rgba(227,199,102,0.16), transparent)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      {/* Radial vignette + base darkening */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0B0B0C_70%)]" />

      {/* Perspective grid floor — gold rules crossed with a white hairline */}
      <div
        className="cine-grid absolute inset-x-0 bottom-0 h-1/2"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,162,39,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        }}
      />

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
            boxShadow: `0 0 ${p.size * 3}px ${p.hue}`,
          }}
          animate={{ y: [-0, -window.innerHeight - 40], x: p.drift, opacity: [0, 0.55, 0.55, 0] }}
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
            className="absolute inset-0 rounded-full border border-nexus-border"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-nexus-accent shadow-[0_0_12px_rgba(201,162,39,0.55)]" />
          </motion.div>
          {/* Mid ring (reverse) */}
          <motion.div
            className="absolute inset-4 rounded-full border border-nexus-accent-rim"
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-nexus-text/70 shadow-[0_0_10px_rgba(255,255,255,0.25)]" />
          </motion.div>
          {/* Inner dashed ring */}
          <motion.div
            className="absolute inset-9 rounded-full border-2 border-dashed border-nexus-border"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          {/* Pulsing core — graphite tile, gold glyph, gold rim (never a gold-filled block) */}
          <motion.div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-nexus-accent-rim bg-nexus-elevated shadow-nexus-e1"
            animate={{
              boxShadow: [
                "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px 2px rgba(201,162,39,0.12)",
                "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 52px 8px rgba(201,162,39,0.26)",
                "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px 2px rgba(201,162,39,0.12)",
              ],
              scale: [1, 1.07, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap className="h-9 w-9 text-nexus-accent drop-shadow-[0_0_10px_rgba(201,162,39,0.45)]" />
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
              className="font-mono text-xs tracking-[0.4em] text-nexus-muted sm:text-sm"
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
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] font-medium uppercase tracking-label text-nexus-muted">
            <span>SYSTEM BOOT</span>
            <span className="text-nexus-accent-light">
              {String(Math.floor(progress)).padStart(3, "0")}%
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-nexus-elevated shadow-nexus-hairline">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-nexus-accent-dark via-nexus-accent to-nexus-accent-light"
              style={{ width: `${progress}%` }}
            />
            <div
              className="cine-shimmer absolute inset-y-0 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Boot log */}
          <div className="mt-5 h-28 space-y-1 overflow-hidden font-mono text-[10px] leading-relaxed text-nexus-muted sm:text-[11px]">
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
              <span className="inline-block h-3 w-2 animate-pulse bg-nexus-muted align-middle" />
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
        className="absolute bottom-[9vh] right-6 z-50 rounded-md px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-label text-nexus-muted transition-colors duration-micro ease-nexus hover:text-nexus-text focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-bg"
      >
        SKIP ▸
      </button>
    </motion.div>
  );
}
