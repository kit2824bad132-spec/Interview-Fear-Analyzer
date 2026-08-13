/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: 'var(--bg-dark)',
        accentBorder: 'rgba(var(--neon-primary), 0.2)',
        neonPrimary: 'rgb(var(--neon-primary))',
        neonSecondary: 'rgb(var(--neon-secondary))',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
