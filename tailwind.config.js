/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: {
    files: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
  },

  theme: {
    extend: {
      colors: {
        sepia: {
          50: '#fdfcf8',
          100: '#f7f3e9',
          200: '#f0ebe0',
          300: '#e5ddd1',
          400: '#d4c4a8',
          500: '#b8a082',
          600: '#9d7c5a',
          700: '#7a5d3c',
          800: '#6b5b54',
          900: '#3a2f2a',
        }
      }
    }
  },
  presets: []
};
