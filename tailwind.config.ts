import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A1714",
        cream: "#F5F3F0",
        card: "#FFFFFF",
        surface: "#EEEBE7",
        line: "#D5CFC8",
        accent: { DEFAULT: "#C8521A", soft: "#E06A35" },
        tech: { DEFAULT: "#097B6E", soft: "#0FA897" },
        gold: "#B5882A",
        positive: "#1A7A4F",
        warn: "#B87820",
        danger: "#C93A2A",
        muted: "#8A8278",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "accent-grad": "linear-gradient(135deg, #C8521A 0%, #D97040 100%)",
        "glow-radial": "radial-gradient(55% 50% at 50% 0%, rgba(200,82,26,0.10) 0%, transparent 70%)",
      },
      boxShadow: {
        glow:  "0 0 0 1px rgba(200,82,26,0.18), 0 20px 48px -20px rgba(160,70,30,0.28)",
        card:  "0 1px 3px 0 rgba(26,23,20,0.06)",
        soft:  "0 1px 2px 0 rgba(26,23,20,0.08)",
      },
      keyframes: {
        floaty:    { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-6px)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        floaty:    "floaty 7s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
