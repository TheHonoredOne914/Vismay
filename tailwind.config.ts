import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  // LIGHT ONLY — no darkMode class. Do not reintroduce.
  darkMode: undefined,
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--vismay-bg)",
        foreground: "var(--vismay-ink)",
        paper: "var(--vismay-paper)",
        cream: "var(--vismay-cream)",
        forest: "var(--vismay-forest)",
        sage: "var(--vismay-sage)",
        gold: "var(--vismay-gold)",
        ink: "var(--vismay-ink)",
        ivory: "var(--vismay-bg)",
        muted: "var(--vismay-muted)",
        "muted-foreground": "var(--vismay-muted-fg)",
        border: "var(--vismay-border)",
        input: "var(--vismay-input)",
        ring: "var(--vismay-ring)",
        primary: {
          DEFAULT: "var(--vismay-forest)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--vismay-cream)",
          foreground: "var(--vismay-ink)",
        },
        accent: {
          DEFAULT: "var(--vismay-sage)",
          foreground: "var(--vismay-forest)",
        },
        card: {
          DEFAULT: "var(--vismay-paper)",
          foreground: "var(--vismay-ink)",
        },
        popover: {
          DEFAULT: "var(--vismay-paper)",
          foreground: "var(--vismay-ink)",
        },
        destructive: {
          DEFAULT: "oklch(0.55 0.18 28)",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "22px",
        "2xl": "28px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        deva: ["var(--font-tiro-devanagari)", "Noto Serif Devanagari", "serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "subtle-float": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "draw-line": {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        twinkle: {
          "0%,100%": { opacity: "0.4", transform: "rotate(45deg) scale(1)" },
          "50%": { opacity: "0.8", transform: "rotate(45deg) scale(0.7)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.2,0.8,0.2,1) both",
        "subtle-float": "subtle-float 7s ease-in-out infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
