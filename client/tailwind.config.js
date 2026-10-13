/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          500: '#1E3A8A',
          800: '#0F172A',
          900: '#0B1120',
        },
        surface: {
          light: '#F8FAFC',
          card: '#FFFFFF',
        }
      },
      boxShadow: {
        'neu-flat': '6px 6px 14px rgba(163, 177, 198, 0.35), -6px -6px 14px rgba(255, 255, 255, 0.9)',
        'neu-pressed': 'inset 4px 4px 8px rgba(163, 177, 198, 0.4), inset -4px -4px 8px rgba(255, 255, 255, 0.9)',
        'neu-card': '8px 8px 18px rgba(163, 177, 198, 0.25), -8px -8px 18px rgba(255, 255, 255, 0.85)',
        'neu-sm': '3px 3px 6px rgba(163, 177, 198, 0.25), -3px -3px 6px rgba(255, 255, 255, 0.8)',
      }
    },
  },
  plugins: [],
}
