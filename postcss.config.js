/**
 * postcss.config.js — PostCSS Plugin Configuration
 *
 * Configures two PostCSS plugins used in the build pipeline:
 *
 * 1. tailwindcss — Processes Tailwind CSS directives (@tailwind, @apply,
 *    etc.) and generates the utility classes used in components.
 *
 * 2. autoprefixer — Automatically adds vendor prefixes (-webkit-, -moz-,
 *    etc.) to CSS properties for cross-browser compatibility, based on
 *    the browserslist configuration in package.json.
 */

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
