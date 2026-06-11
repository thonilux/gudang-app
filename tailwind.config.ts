import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "hsl(var(--surface))",
        panel: "hsl(var(--panel))",
        panelAlt: "hsl(var(--panel-alt))",
        border: "hsl(var(--border))",
        text: "hsl(var(--text))",
        muted: "hsl(var(--muted))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgb(15 23 42 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

