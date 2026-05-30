import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // §5.2 3레인 색 체계
        lane: {
          ai: "#14b8a6", // teal
          edge: "#8b5cf6", // purple
          field: "#fb7185", // coral
        },
      },
    },
  },
  plugins: [],
};
export default config;
