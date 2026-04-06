/**
 * main.jsx — Application Entry Point
 *
 * Bootstraps the React application by rendering the root <App> component
 * into the DOM element with id="root" (defined in index.html).
 *
 * Wrapped in StrictMode to surface potential issues during development
 * (double-invokes effects and renders to detect side effects).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
