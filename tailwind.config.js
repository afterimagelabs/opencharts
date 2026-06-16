/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#15171a',
          soft: '#2a2d33',
          muted: '#5a5f6a',
        },
        paper: {
          DEFAULT: '#fbfaf6',
          warm: '#f4f1e8',
          edge: '#e6e2d4',
        },
        seal: {
          DEFAULT: '#7a1f1f',
          deep: '#5a1515',
        },
        moss: '#3a5a3a',
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
};
