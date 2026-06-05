import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Cpu, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const FALLBACK_MODELS = ["llama3", "mistral", "llama3.1", "phi3"];

export default function ModelSelector({ value, onChange }) {
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRef = useRef(null);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClose = () => setIsOpen(false);

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [isOpen]);

  const handleOutsideClick = (e) => {
    if (buttonRef.current && !buttonRef.current.contains(e.target)) {
      // Check if click is inside the portal dropdown
      const portal = document.getElementById("model-selector-portal");
      if (portal && portal.contains(e.target)) return;
      setIsOpen(false);
    }
  };

  const calculatePosition = () => {
    if (!buttonRef.current) return {};

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 200;
    const dropdownHeight = 280;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    // Horizontal: align to right edge of button, clamp to viewport
    let left = rect.right - dropdownWidth;
    if (left < 8) left = 8;
    if (left + dropdownWidth > viewportW - 8) {
      left = viewportW - dropdownWidth - 8;
    }

    // Vertical: prefer below, flip above if not enough space
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;

    let top;
    let transformOrigin;

    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      // Open downward
      top = rect.bottom + 6;
      transformOrigin = "top right";
    } else {
      // Open upward
      top = rect.top - dropdownHeight - 6;
      transformOrigin = "bottom right";
    }

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${dropdownWidth}px`,
      zIndex: 99999,
      transformOrigin,
    };
  };

  const handleToggle = () => {
    if (!isOpen) {
      setDropdownStyle(calculatePosition());
    }
    setIsOpen((prev) => !prev);
  };

  const fetchModels = async () => {
    try {
      const { data } = await axios.get("http://localhost:11434/api/tags", {
        timeout: 3000,
      });
      const names = data.models?.map((m) => m.name) || [];
      if (names.length > 0) setModels(names);
    } catch {
      // Silent fallback
    }
  };

  const selectedLabel = value || "llama3";

  // The dropdown rendered via portal at body level
  const DropdownPortal = () =>
    createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="model-selector-portal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={dropdownStyle}
            className="bg-nexus-card border border-nexus-border
                       rounded-xl shadow-2xl shadow-black/60
                       overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-nexus-border">
              <p className="text-xs text-nexus-muted font-medium tracking-wide">
                Available Models
              </p>
            </div>

            {/* Model list */}
            <div className="p-1 max-h-52 overflow-y-auto">
              {models.map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    onChange(model);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between
                             gap-2 px-2.5 py-2 rounded-lg text-left
                             text-xs text-nexus-text
                             hover:bg-nexus-surface transition-colors"
                >
                  <span className="font-mono truncate">{model}</span>
                  {value === model && (
                    <Check className="w-3 h-3 text-nexus-accent flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-nexus-border">
              <p className="text-xs text-nexus-muted">Powered by Ollama</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5
                   rounded-lg bg-nexus-surface border border-nexus-border
                   text-xs text-nexus-muted hover:text-nexus-text
                   hover:border-nexus-accent/50
                   transition-all duration-200 whitespace-nowrap
                   relative z-10"
      >
        <Cpu className="w-3 h-3 text-nexus-accent flex-shrink-0" />
        <span className="font-medium max-w-[72px] truncate">
          {selectedLabel}
        </span>
        <ChevronDown
          className={`w-3 h-3 flex-shrink-0 transition-transform duration-200
                      ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <DropdownPortal />
    </>
  );
}
