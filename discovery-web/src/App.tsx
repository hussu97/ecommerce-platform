import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProductListPage } from "./pages/ProductListPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductListPage />} />
      </Routes>
    </BrowserRouter>
  );
}
