import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm "parchment" palette
        ink: "#2c2118", // primary text (warm dark brown)
        cream: "#faf4ea", // page background
        card: "#fffaf2", // card surface
        surface: "#f4ebda", // subtle warm inner panels
        line: "#eadfcb", // warm borders
        accent: { DEFAULT: "#dd7a45", soft: "#eca878" }, // terracotta (warm primary)
        tech: { DEFAULT: "#0f9e8d", soft: "#27b9a7" }, // teal (cool DeFi accent)
        gold: "#e7b35c",
        positive: "#2f9e6b",
        warn: "#d99a2f",
        danger: "#d4634a",
        muted: "#9a8c76", // warm taupe
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      backgroundImage: {
        "accent-grad": "linear-gradient(110deg, #dd7a45 0%, #e79a4c 55%, #e7b35c 100%)",
        "glow-radial": "radial-gradient(60% 60% at 50% 0%, rgba(221,122,69,0.16) 0%, rgba(250,244,234,0) 70%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(221,122,69,0.12), 0 24px 60px -24px rgba(176,108,54,0.4)",
        card: "0 16px 40px -28px rgba(120,80,40,0.35)",
        soft: "0 2px 10px -4px rgba(120,80,40,0.18)",
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-8px)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
