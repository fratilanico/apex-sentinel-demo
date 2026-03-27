import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy:    "#0d1b2a",
        navy2:   "#0f2035",
        navy3:   "#162840",
        navy4:   "#1a3050",
        panel:   "#0a1525",
        cyan:    "#00d4ff",
        amber:   "#ffaa00",
        threat:  "#ff4444",
        safe:    "#00e676",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
