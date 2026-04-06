/**
 * vite.config.js — Vite Build Tool Configuration
 *
 * Minimal configuration for the Vite build tool:
 * - Enables the React plugin (@vitejs/plugin-react) which provides
 *   JSX transformation and Fast Refresh (HMR) during development.
 *
 * The dev server runs on the default port (5173) and proxies API
 * requests to the backend via the frontend's backendApi.js service
 * (no Vite proxy configuration needed since the API URL is absolute).
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
