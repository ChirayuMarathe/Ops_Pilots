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
        // Executive Dark Palette (#222831, #393E46, #948979, #DFD0B8)
        base: '#222831',
        background: '#222831',
        surface: '#2b313a',
        card: '#393E46',
        cardLight: '#434952',
        border: 'rgba(148, 137, 121, 0.22)',
        borderStrong: '#948979',
        muted: '#948979',
        accent: '#DFD0B8',
        accentHover: '#ece2d0',
        primary: {
          DEFAULT: '#DFD0B8',
          hover: '#ece2d0',
          foreground: '#222831',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
        elevation: '0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.25)',
        glow: '0 0 15px -3px rgba(223, 208, 184, 0.15)',
      },
    },
  },
  plugins: [],
}
