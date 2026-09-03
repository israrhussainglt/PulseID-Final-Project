import type { Config } from "tailwindcss";

// Same design language as frontend/ on purpose — this is still PulseID,
// just a different room in the same building. Colors, fonts, and shadow
// tokens are copied exactly from frontend/tailwind.config.ts so the two
// apps feel like one product, not a clinical tool bolted to a BI tool.
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B2027",
        paper: "#F6F8F8",
        teal: {
          DEFAULT: "#0E7C7B",
          dark: "#0A5F5E",
          light: "#E4F2F1",
        },
        sage: "#4C6663",
        alert: {
          DEFAULT: "#D64550",
          light: "#FCEAEB",
        },
        amber: {
          DEFAULT: "#B8790B",
          light: "#FBF0DD",
        },
        line: "#DCE4E3",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,32,39,0.04), 0 1px 12px rgba(11,32,39,0.06)",
      },
      keyframes: {
        "pulse-line": {
          "0%": { strokeDashoffset: "240" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "pulse-line": "pulse-line 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
