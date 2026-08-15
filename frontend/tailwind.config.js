/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-bg) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        line: "rgb(var(--color-border) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        good: "rgb(var(--color-good) / <alpha-value>)",
        bad: "rgb(var(--color-bad) / <alpha-value>)",
        warn: "rgb(var(--color-warn) / <alpha-value>)",
        body: "rgb(var(--color-body) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};