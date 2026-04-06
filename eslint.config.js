/**
 * eslint.config.js — ESLint Flat Configuration
 *
 * Configures ESLint for the StoryWeaver frontend using the new flat
 * config format (eslint v9+).
 *
 * Extends:
 * - @eslint/js recommended rules (core JavaScript best practices)
 * - eslint-plugin-react-hooks (enforces Rules of Hooks)
 * - eslint-plugin-react-refresh (validates Fast Refresh compatibility)
 *
 * Custom rules:
 * - no-unused-vars: Errors on unused variables, but ignores variables
 *   whose names start with an uppercase letter or underscore (common
 *   pattern for imported-but-only-JSX-used React components).
 *
 * Ignores the dist/ directory to skip linting build output.
 */

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      /* Allow unused variables that start with uppercase (React components)
         or underscore (intentionally unused parameters) */
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
