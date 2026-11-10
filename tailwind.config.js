/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surfaceMuted: "var(--surface-muted)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        border: "var(--border)",
        primary: { DEFAULT: "var(--primary)", ink: "var(--primary-ink)" },
        accent: { DEFAULT: "var(--accent)", ink: "var(--accent-ink)" },
        success: { DEFAULT: "var(--success)", ink: "var(--success-ink)" },
        warning: { DEFAULT: "var(--warning)", ink: "var(--warning-ink)" },
        danger: { DEFAULT: "var(--danger)", ink: "var(--danger-ink)" },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
    },
  },
  plugins: [],
};
