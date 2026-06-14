import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080a18",
        panel: "#0e1124",
        surface: "#12162e",
        accent: { DEFAULT: "#6c8cff", soft: "#8aa2ff" },
        cyan: { DEFAULT: "#34d0e0" },
        positive: "#3ddc97",
        warn: "#f5a623",
        danger: "#ff6b6b",
        muted: "#8b93b0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "accent-grad": "linear-gradient(110deg, #6c8cff 0%, #8a6cff 45%, #34d0e0 100%)",
        "glow-radial": "radial-gradient(60% 60% at 50% 0%, rgba(108,140,255,0.18) 0%, rgba(8,10,24,0) 70%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(108,140,255,0.15), 0 20px 60px -20px rgba(108,140,255,0.35)",
        card: "0 10px 40px -20px rgba(0,0,0,0.6)",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
