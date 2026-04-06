/**
 * tailwind.config.js — Tailwind CSS Configuration
 *
 * Customises Tailwind CSS for the StoryWeaver project:
 *
 * - darkMode: "class" — Enables the .dark variant prefix. Theme switching
 *   is controlled by toggling the 'dark' CSS class on the <html> element
 *   (handled by the ThemeToggle component via AppContext).
 *
 * - content: Scans all JSX/TSX files in src/ and the root index.html
 *   for Tailwind class usage (tree-shaking unused utilities).
 *
 * - theme.extend.colors.sepia: Custom colour palette for the sepia theme.
 *   Provides a full 50-900 scale of warm, parchment-like tones used
 *   throughout the UI when the sepia theme is active.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Sepia colour scale — warm, earthy tones for the parchment theme */
        sepia: {
          50: '#fdfcf8',   // Lightest (backgrounds)
          100: '#f7f3e9',
          200: '#f0ebe0',
          300: '#e5ddd1',
          400: '#d4c4a8',
          500: '#b8a082',  // Mid-tone (borders, muted text)
          600: '#9d7c5a',
          700: '#7a5d3c',
          800: '#6b5b54',
          900: '#3a2f2a',  // Darkest (headings, primary text)
        }
      }
    }
  },
  plugins: [],
};
