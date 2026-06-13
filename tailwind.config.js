/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sar: {
          red:    '#DC2626',
          orange: '#EA580C',
          yellow: '#CA8A04',
          green:  '#16A34A',
          dark:   '#0F172A',
          panel:  '#1E293B',
          border: '#334155',
          text:   '#94A3B8',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
