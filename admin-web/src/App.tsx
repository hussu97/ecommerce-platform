import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { BulkUploadsPage } from "./pages/BulkUploadsPage";
import { BrandsPage } from "./pages/BrandsPage";
import { TaxonomiesPage } from "./pages/TaxonomiesPage";
import { TaxonomyAttributesPage } from "./pages/TaxonomyAttributesPage";
import { OrdersPage } from "./pages/OrdersPage";
import { useAuthStore } from "./stores/useAuthStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/bulk" element={<BulkUploadsPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="taxonomies" element={<TaxonomiesPage />} />
          <Route path="taxonomy-attributes" element={<TaxonomyAttributesPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
