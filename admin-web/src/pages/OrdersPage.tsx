import { useEffect, useState } from "react";
import api from "../lib/api";

interface Order {
  id: number;
  user_id: number;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address: string;
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders/").then((r) => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await api.put(`/orders/${orderId}/status`, null, { params: { status: newStatus } });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
    } catch {
      alert("Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-text-primary mb-8">Orders</h1>
      <div className="bg-white rounded-2xl border border-sand-divider overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-background-light border-b border-sand-divider">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Order ID</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Date</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Amount</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Status</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-sand-divider last:border-0">
                <td className="py-4 px-4 text-text-primary">#{o.id}</td>
                <td className="py-4 px-4 text-text-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="py-4 px-4 text-text-primary">AED {o.total_amount.toFixed(2)}</td>
                <td className="py-4 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    o.status === "paid" ? "bg-green-100 text-green-800" :
                    o.status === "shipped" ? "bg-blue-100 text-blue-800" : "bg-sand-divider/50 text-text-muted"
                  }`}>{o.status}</span>
                </td>
                <td className="py-4 px-4">
                  {o.status === "paid" && (
                    <button
                      onClick={() => updateStatus(o.id, "shipped")}
                      className="px-3 py-1.5 border border-sand-divider rounded-xl text-sm text-text-primary hover:bg-sand-divider/30 transition-colors"
                    >
                      Mark Shipped
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="py-10 text-center text-text-muted">No orders yet.</div>
        )}
      </div>
    </div>
  );
}
