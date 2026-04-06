/**
 * App.jsx — Root Application Component
 *
 * Sets up the core application infrastructure:
 * - BrowserRouter for client-side routing
 * - AppProvider for global state management (wraps the entire tree)
 * - A catch-all route that renders BookBrowser as the main (and only) page
 *
 * The router is configured outside AppProvider because React Router's
 * hooks are used within AppProvider's children, not within AppProvider itself.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from "./context/AppContext";
import BookBrowser from "./components/BookBrowser";

function App() {
  return (
    <Router>
      <AppProvider>
        <div className="App">
          <Routes>
            {/* Catch-all route — BookBrowser handles the entire UI */}
            <Route path="*" element={<BookBrowser />} />

          </Routes>
        </div>
      </AppProvider>
    </Router>
  );
}

export default App;