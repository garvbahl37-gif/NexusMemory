import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    console.log("App: creating new session:", newId);
    setCurrentSessionId(newId);
    return newId;
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-nexus-bg">
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
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="hidden md:flex flex-shrink-0 overflow-hidden"
            >
              <div className="w-[260px] h-full">
                <Sidebar
                  currentSessionId={currentSessionId}
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
                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
              />

              {/* Mobile sidebar */}
              <motion.div
                key="sidebar-mobile"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] z-40"
              >
                <Sidebar
                  currentSessionId={currentSessionId}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatWindow
          sessionId={currentSessionId}
          onNewSession={handleNewSessionCreated}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </div>
  );
}
