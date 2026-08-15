/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f1115",
        panel: "#161a21",
        line: "#262b34",
        gold: "#c9a227",
        good: "#2f9e5b",
        bad: "#c0473f",
        warn: "#c9962c",
      },
    },
  },
  plugins: [],
};
