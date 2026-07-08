/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F8FB",
        panel: "#FFFFFF",
        ink: {
          DEFAULT: "#141A2E",
          soft: "#4B5268",
          faint: "#8A90A6",
        },
        navy: {
          DEFAULT: "#10142B",
          light: "#181D3B",
          border: "#262C4C",
        },
        accent: {
          DEFAULT: "#4F5DFF",
          soft: "#E7E8FF",
          dark: "#3A45D1",
        },
        signal: {
          urgent: "#DC2626",
          high: "#F97316",
          medium: "#EAB308",
          low: "#16A34A",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 26, 46, 0.04), 0 1px 8px rgba(20, 26, 46, 0.06)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
