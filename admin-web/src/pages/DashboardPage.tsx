import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { PageLoader } from "../components/PageLoader";
import { Package, ShoppingBag, ArrowRight } from "lucide-react";

export function DashboardPage() {
  const [ordersCount, setOrdersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/orders/"),
      api.get("/products/"),
    ])
      .then(([ordersRes, productsRes]) => {
        setOrdersCount(Array.isArray(ordersRes.data) ? ordersRes.data.length : 0);
        setProductsCount(Array.isArray(productsRes.data) ? productsRes.data.length : 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-text-primary mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-sand-divider p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-lg font-semibold text-text-muted">Total Orders</h2>
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <p className="font-display text-3xl font-bold text-text-primary mt-2">{ordersCount}</p>
          <Link
            to="/orders"
            className="mt-4 inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          >
            View orders <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-sand-divider p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-lg font-semibold text-text-muted">Total Products</h2>
            <Package className="h-8 w-8 text-primary" />
          </div>
          <p className="font-display text-3xl font-bold text-text-primary mt-2">{productsCount}</p>
          <Link
            to="/products"
            className="mt-4 inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          >
            Manage products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-sand-divider p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-text-muted mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link
            to="/products"
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 active:scale-[0.98] transition-transform"
          >
            Add Product
          </Link>
          <Link
            to="/orders"
            className="px-5 py-2.5 bg-white border border-sand-divider text-text-primary rounded-xl font-medium hover:bg-sand-divider/30 active:scale-[0.98] transition-transform"
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
