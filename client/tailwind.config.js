/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d5f5e3",
          200: "#afe8cb",
          300: "#7bd6ad",
          400: "#44bd89",
          500: "#22a36e",
          600: "#148458",
          700: "#106a48",
          800: "#10543b",
          900: "#0e4532",
          950: "#031a12",
        },
        primary: "#148458",
        "primary-light": "#44bd89",
        accent: "#f0fdf6",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(20, 132, 88, 0.15)",
        "glow-lg": "0 0 40px rgba(20, 132, 88, 0.2)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.06)",
        "glass-lg": "0 16px 48px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
