/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      screens: {
        sm: "375px",
        md: "480px",
      },
    },
    extend: {
      colors: {
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        status: {
          qualified: "#16A34A",
          qualifiedBg: "#DCFCE7",
          critical: "#CA8A04",
          criticalBg: "#FEF9C3",
          out: "#DC2626",
          outBg: "#FEE2E2",
        },
        accent: {
          orange: "#F97316",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"PingFang SC\"",
          "\"Hiragino Sans GB\"",
          "\"Microsoft YaHei\"",
          "sans-serif",
        ],
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.3)", opacity: "0.7" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.5s ease-in-out infinite",
        slideUp: "slideUp 0.25s ease-out",
        slideInRight: "slideInRight 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
