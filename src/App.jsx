import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from "./context/AppContext";
import BookBrowser from "./components/BookBrowser";

function App() {
  return (
    <Router>
      <AppProvider>
        <div className="App">
          <Routes>
            <Route path="*" element={<BookBrowser />} />

          </Routes>
        </div>
      </AppProvider>
    </Router>
  );
}

export default App;