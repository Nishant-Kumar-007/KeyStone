/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090a0f",
        surface: {
          DEFAULT: "#11131a",
          secondary: "#171a24",
          tertiary: "#1f2330",
          border: "#282c3c"
        },
        keystone: {
          amber: "#f59e0b",
          coral: "#f43f5e",
          green: "#10b981",
          red: "#ef4444",
          muted: "#94a3b8"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      }
    },
  },
  plugins: [],
}
