import { AppProvider } from "./context/AppContext";
import BookBrowser from "./components/BookBrowser";
import "./App.css";

function App() {
  return (
    <AppProvider>
      <div className="App">
        <BookBrowser />
      </div>
    </AppProvider>
  );
}

export default App;
