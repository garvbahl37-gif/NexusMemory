import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

// The chosen model is shared by the picker, the composer and both status
// lines, so it lives here rather than inside the chat window.
const MODEL_KEY = "nexus_model";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import CinematicLoader from "./components/CinematicLoader";

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  // Bumped once a reply is stored, so the sidebar picks up the new title.
  const [sessionsVersion, setSessionsVersion] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [booting, setBooting] = useState(true);
  const [model, setModelState] = useState(
    () => localStorage.getItem(MODEL_KEY) || "",
  );

  const setModel = useCallback((next) => {
    setModelState(next);
    try {
      localStorage.setItem(MODEL_KEY, next);
    } catch {
      // A blocked localStorage only costs the choice on the next reload.
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
  }, []);

  const handleSelectSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleNewSessionCreated = useCallback(() => {
    const newId = uuidv4();
    setCurrentSessionId(newId);
    return newId;
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden gap-2.5 p-2.5 bg-[radial-gradient(125%_125%_at_50%_0%,#131315_0%,#0B0B0C_55%)]">
      {/* Cinematic boot sequence on entry */}
      <AnimatePresence>
        {booting && (
          <CinematicLoader key="loader" onComplete={() => setBooting(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop always visible, mobile overlay */}
      <>
        {/* Desktop sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              key="sidebar-desktop"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              className="hidden md:flex flex-shrink-0 overflow-hidden"
            >
              <div className="w-[260px] h-full">
                <Sidebar
                  currentSessionId={currentSessionId}
                  version={sessionsVersion}
                  model={model}
                  onNewChat={handleNewChat}
                  onSelectSession={handleSelectSession}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="md:hidden fixed inset-0 bg-black/[0.72] backdrop-blur-sm z-30"
              />

              {/* Mobile sidebar */}
              <motion.div
                key="sidebar-mobile"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                className="md:hidden fixed left-2.5 top-2.5 bottom-2.5 w-[260px] z-40"
              >
                <Sidebar
                  currentSessionId={currentSessionId}
                  version={sessionsVersion}
                  model={model}
                  onNewChat={handleNewChat}
                  onSelectSession={handleSelectSession}
                  onClose={() => setSidebarOpen(false)}
                  isMobile={true}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>

      {/* Main Chat Area — floating rounded panel */}
      <div className="flex-1 flex flex-col min-w-0 relative rounded-2xl border border-nexus-border overflow-hidden bg-nexus-bg shadow-nexus-e2">
        <ChatWindow
          sessionId={currentSessionId}
          onNewSession={handleNewSessionCreated}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          model={model}
          onModelChange={setModel}
          onConversationSaved={() => setSessionsVersion((v) => v + 1)}
        />
      </div>
    </div>
  );
}
