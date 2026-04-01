import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import ImportPage from "./components/ImportPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/importar" element={<ImportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

