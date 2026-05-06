import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0f172a",
        accent: "#38bdf8",
        glow: "#f472b6",
      },
    },
  },
  plugins: [],
};

export default config;
