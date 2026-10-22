/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#060b10',
          900: '#0a1017',
          850: '#0e1620',
          800: '#14202e',
          700: '#1e2d3d',
        },
        primary: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        accent: '#3b82f6',
        warning: '#f59e0b',
        danger: '#ef4444',
        purple: '#8b5cf6',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(16, 185, 129, 0.35)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.35)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.35)',
      }
    },
  },
  plugins: [],
}
