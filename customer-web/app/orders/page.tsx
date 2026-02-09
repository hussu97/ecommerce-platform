"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import { Package } from "lucide-react";

interface OrderItemProduct {
  id: string;
  name: string;
  image_url?: string;
  price: number;
  category_path?: string;
}

interface OrderItem {
  id: number;
  quantity: number;
  price_at_purchase: number;
  product?: OrderItemProduct;
}

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address: string | null;
  items: OrderItem[];
}

function statusLabel(status: string, t: (k: string) => string): string {
  const s = (status || "").toLowerCase();
  if (s === "shipped" || s === "in_transit") return t("in_transit");
  if (s === "delivered") return t("delivered");
  return t("status_processing");
}

function statusSubtext(order: Order, t: (k: string) => string): string {
  const s = (order.status || "").toLowerCase();
  if (s === "shipped" || s === "in_transit") return t("arriving_soon");
  if (s === "delivered") return `${t("received_on")} ${new Date(order.created_at).toLocaleDateString()}`;
  return t("preparing_for_courier");
}

function statusSectionLabel(order: Order, t: (k: string) => string): string {
  const s = (order.status || "").toLowerCase();
  if (s === "shipped" || s === "in_transit") return t("timeline");
  if (s === "delivered") return t("support");
  return t("section_status");
}

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const t = useI18nStore((s) => s.t);
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/orders");
      return;
    }
    api
      .get("/orders/my-orders")
      .then((res) => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (isLoading) {
    return <PageLoader className="min-h-[60vh]" />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8f7f6] text-[#181511] max-w-[430px] md:max-w-2xl mx-auto flex flex-col">
      <header className="flex items-center justify-between p-4 pb-2 sticky top-0 z-50 bg-[#f8f7f6]/95 backdrop-blur-md border-b border-[#e5e1da]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-10 items-center justify-center rounded-full bg-white border border-[#e5e1da] shadow-sm"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="serif-font text-xl font-bold leading-tight tracking-[-0.015em]">{t("my_orders")}</h1>
        </div>
        <button type="button" className="flex items-center justify-center rounded-full size-10 bg-transparent text-[#181511]" aria-label={t("filters")}>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
        </button>
      </header>

      <div className="flex flex-col gap-6 p-4 pb-24">
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-[#e5e1da] shadow-sm">
            <Package className="h-16 w-16 text-[#897961] mx-auto mb-4" />
            <p className="serif-font text-lg font-bold text-[#181511] mb-2">{t("no_orders_yet")}</p>
            <Link href="/">
              <button className="mt-4 px-6 py-3 rounded-full bg-[#ec9213] text-white font-bold text-sm uppercase tracking-widest shadow-lg">
                {t("start_shopping")}
              </button>
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const firstItem = order.items?.[0];
            const product = firstItem?.product;
            const status = statusLabel(order.status, t);
            const isDelivered = (order.status || "").toLowerCase() === "delivered";
            const isProcessing = (order.status || "").toLowerCase() === "paid" || (order.status || "").toLowerCase() === "processing";
            return (
              <div key={order.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#e5e1da] pb-2">
                  <span className="serif-font text-sm font-bold text-[#ec9213] italic">{status}</span>
                  <span className="text-[11px] text-[#897961] uppercase tracking-wider font-medium">
                    #{order.order_number || order.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="aspect-[4/5] rounded-xl overflow-hidden bg-white shadow-sm relative">
                      {product?.image_url ? (
                        <img src={product.image_url} alt={product.name || ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#897961]">
                          <Package className="size-10" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="serif-font text-sm font-bold text-[#181511] line-clamp-2">{product?.name || t("product")}</h3>
                      <p className="text-xs text-[#897961] mb-1">{statusSubtext(order, t)}</p>
                      <p className="text-sm font-semibold text-[#ec9213] uppercase">AED {order.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-[#897961] uppercase tracking-widest font-bold">{statusSectionLabel(order, t)}</p>
                      <p className="serif-font text-xs">{statusSubtext(order, t)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={`/orders/${order.id}`}>
                        <button className="w-full py-2.5 rounded-full border border-[#ec9213] text-[#ec9213] text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-[#ec9213]/10 transition-colors">
                          {t("track_order")}
                        </button>
                      </Link>
                      {isDelivered && (
                        <Link href="/">
                          <button className="w-full py-2.5 rounded-full bg-[#181511] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#2d2419] transition-colors">
                            {t("order_again")}
                          </button>
                        </Link>
                      )}
                      {isProcessing && (
                        <button type="button" className="w-full py-2.5 rounded-full border border-[#e5e1da] text-[#181511] text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-[#f1eee9] transition-colors">
                          {t("cancel_order")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
