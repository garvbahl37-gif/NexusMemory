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
      {/* Avatar */}
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
        <Zap className="h-4 w-4 text-white" />
      </div>

      {/* Typing bubble */}
      <div className="rounded-2xl rounded-tl-md bg-gradient-to-br from-white/12 to-white/[0.03] p-[1px] shadow-lg shadow-black/20">
        <div className="rounded-2xl rounded-tl-md bg-nexus-card px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="typing-dot h-2 w-2 rounded-full bg-gradient-to-br from-nexus-accent to-cyan-400"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
