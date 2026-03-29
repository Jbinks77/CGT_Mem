import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#141414",
        border: "#262626",
        muted: "#737373",
        accent: "#3b82f6",
      },
    },
  },
  plugins: [],
};
export default config;
