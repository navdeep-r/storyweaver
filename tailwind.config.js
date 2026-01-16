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
          50: '#fffefb',   // Lightened from #fdfcf8
          100: '#faf6ec',  // Lightened from #f7f3e9
          200: '#f0ebe0',
          300: '#e5ddd1',
          400: '#d4c4a8',
          500: '#b8a082',
          600: '#9d7c5a',
          700: '#6d4f2e',  // Darkened from #7a5d3c
          800: '#4a3a28',  // Darkened from #6b5b54
          900: '#2a1f1a',  // Darkened from #3a2f2a
        }
      }
    }
  },
  presets: []
};
