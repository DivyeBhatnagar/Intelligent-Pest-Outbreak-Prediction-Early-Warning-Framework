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
        "primary": "#006c46",
        "on-primary": "#ffffff",
        "primary-container": "#00f0a0",
        "on-primary-container": "#006843",
        "primary-fixed": "#4dffb2",
        "primary-fixed-dim": "#00e296",
        "on-primary-fixed": "#002112",
        "on-primary-fixed-variant": "#005234",
        "inverse-primary": "#00e296",

        "secondary": "#5e5e5e",
        "on-secondary": "#ffffff",
        "secondary-container": "#e2e2e2",
        "on-secondary-container": "#646464",
        "secondary-fixed": "#e2e2e2",
        "secondary-fixed-dim": "#c6c6c6",
        "on-secondary-fixed": "#1b1b1b",
        "on-secondary-fixed-variant": "#474747",

        "tertiary": "#52634b",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#c6d8bb",
        "on-tertiary-container": "#4e5f47",
        "tertiary-fixed": "#d5e8ca",
        "tertiary-fixed-dim": "#baccaf",
        "on-tertiary-fixed": "#111f0d",
        "on-tertiary-fixed-variant": "#3b4b35",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        "surface": "#f7f9ff",
        "surface-dim": "#d1dbe8",
        "surface-bright": "#f7f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#edf4ff",
        "surface-container": "#e5effc",
        "surface-container-high": "#dfe9f6",
        "surface-container-highest": "#d9e3f1",
        "surface-variant": "#d9e3f1",
        "surface-soft": "#f2f4f5",
        "surface-tint": "#006c46",

        "on-surface": "#131c26",
        "on-surface-variant": "#3b4a40",
        "inverse-surface": "#28313b",
        "inverse-on-surface": "#e8f2ff",

        "outline": "#6b7b70",
        "outline-variant": "#b9cbbe",
        "border-hairline": "#e5e7eb",
        "canvas": "#ffffff",
        "background": "#f7f9ff",
        "on-background": "#131c26",

        "risk-low": "#10b981",
        "risk-moderate": "#f59e0b",
        "risk-high": "#f97316",
        "risk-critical": "#ef4444",

        // Keep legacy dark mappings for backward compatibility if needed
        dark: {
          950: '#060b10',
          900: '#0a1017',
          850: '#0e1620',
          800: '#14202e',
          700: '#1e2d3d',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        headline: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        'title-md': ['"Inter"', 'sans-serif'],
        'title-lg': ['"Space Grotesk"', 'sans-serif'],
        'body-md': ['"Inter"', 'sans-serif'],
        'body-sm': ['"Inter"', 'sans-serif'],
        'caption': ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '1rem',
        'lg': '2rem',
        'xl': '3rem',
        'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'card': '0 4px 20px -2px rgba(19, 28, 38, 0.05)',
        'elevated': '0 10px 25px -5px rgba(19, 28, 38, 0.08)',
      }
    },
  },
  plugins: [
    // optional form plugins can be added here
  ],
}
