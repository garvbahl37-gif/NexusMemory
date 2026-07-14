import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mb-5 flex items-start gap-3"
    >
      {/* Avatar — graphite tile + gold glyph + gold rim */}
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-nexus-accent-rim bg-nexus-elevated shadow-nexus-e1">
        <Zap className="h-4 w-4 text-nexus-accent" />
      </div>

      {/* Typing bubble — e1 card + 1px border + inset top hairline */}
      <div className="rounded-2xl rounded-tl-md border border-nexus-border bg-nexus-card shadow-nexus-e1">
        <div className="rounded-2xl rounded-tl-md px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="typing-dot h-2 w-2 rounded-full bg-nexus-muted"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
