import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from "./context/AppContext";
import BookBrowser from "./components/BookBrowser";
// import LanguageSelectionPage from "./components/LanguageSelectionPage";

function App() {
  return (
    <Router>
      <AppProvider>
        <div className="App">
          <Routes>
            {/* <Route path="/" element={<Navigate to="/language-select" replace />} />
            <Route path="/language-select" element={<LanguageSelectionPage />} />
            <Route path="/browse" element={<BookBrowser />} /> */}
            <Route path="*" element={<BookBrowser />} />

          </Routes>
        </div>
      </AppProvider>
    </Router>
  );
}

export default App;