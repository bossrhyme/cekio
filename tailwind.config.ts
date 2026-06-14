import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0e14",
        panel: "#11151f",
        accent: "#5b8cff",
        muted: "#8b94a7",
      },
    },
  },
  plugins: [],
};

export default config;
