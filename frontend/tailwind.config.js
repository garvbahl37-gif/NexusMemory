/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          /* ── Graphite tonal ladder ── */
          bg: "#0B0B0C", // app background (pure neutral graphite)
          surface: "#131315", // sidebar, topbar, composer bar, panels, modal
          card: "#1A1A1D", // cards, message bubbles, dropdowns, file rows
          elevated: "#212125", // hover/raised surfaces, dropdown menus, active rows
          border: "#2A2A2E", // standard 1px borders
          hairline: "rgba(255,255,255,0.06)", // inset top-edge highlight

          /* ── Champagne gold accent (jewelry, not fabric) ── */
          accent: "#C9A227", // THE accent
          "accent-light": "#E3C766", // gold TEXT, hover on gold fills
          "accent-dark": "#A8851C", // pressed state on gold fills
          "accent-ink": "#0B0B0C", // the ONLY text/icon color allowed ON a gold fill
          "accent-soft": "rgba(201,162,39,0.10)", // tinted gold wash
          "accent-rim": "rgba(201,162,39,0.35)", // gold border/ring, low emphasis

          /* ── Type ── */
          text: "#F0EFED", // primary (warm off-white) — 17.1:1 on bg
          muted: "#8A878D", // secondary — 4.8:1 on card (AA)
          subtle: "#6A676E", // tertiary/disabled, ICONS ONLY — never small body text

          /* ── Semantic ── */
          success: "#57A773", // soft jade
          warning: "#D2833C", // burnt amber (distinct from gold)
          error: "#C4554D", // muted brick
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      letterSpacing: {
        label: "0.08em",
      },
      transitionTimingFunction: {
        nexus: "cubic-bezier(0.2, 0, 0, 1)",
      },
      transitionDuration: {
        micro: "150ms",
        panel: "220ms",
      },
      boxShadow: {
        /* Elevation ladder — dark UIs separate by light-on-edge, not drop shadow */
        "nexus-e1": "inset 0 1px 0 rgba(255,255,255,0.06)",
        "nexus-e2":
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px -12px rgba(0,0,0,0.7)",
        "nexus-e3":
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px -20px rgba(0,0,0,0.85)",
        /* Detail */
        "nexus-hairline": "inset 0 1px 0 rgba(255,255,255,0.06)",
        "nexus-focus": "0 0 0 2px #0B0B0C, 0 0 0 4px #C9A227",
        "nexus-glow": "0 0 24px rgba(201,162,39,0.12)",
        "nexus-rim": "0 0 0 1px rgba(201,162,39,0.35)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slideUp 0.3s cubic-bezier(0.2, 0, 0, 1)",
        "fade-in": "fadeIn 0.2s cubic-bezier(0.2, 0, 0, 1)",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
