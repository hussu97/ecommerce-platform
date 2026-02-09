"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import { MapPin, Check, Package, Truck } from "lucide-react";

interface OrderItemProduct {
  id: string;
  name: string;
  image_url?: string;
  price: number;
  category_path?: string;
}

interface OrderItem {
  id: number;
  order_item_number: number;
  quantity: number;
  price_at_purchase: number;
  status: string;
  product?: OrderItemProduct;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_address: string | null;
  created_at: string;
  items: OrderItem[];
}

function formatPlaced(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const t = useI18nStore((s) => s.t);
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !isAuthenticated) {
      setLoading(false);
      if (!isAuthenticated) router.push("/login?redirect=/orders/" + id);
      return;
    }
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (loading) {
    return <PageLoader className="min-h-[60vh]" />;
  }

  if (!order) {
    return (
      <div className="max-w-[430px] md:max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-[#897961] mb-4">{t("no_orders_yet")}</p>
        <Link href="/orders" className="text-[#ec9213] font-semibold">{t("my_orders")}</Link>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, i) => sum + i.quantity * i.price_at_purchase, 0);
  const shippingAmount = Math.max(0, order.total_amount - subtotal);
  const status = (order.status || "").toLowerCase();

  const timeline = [
    { key: "delivered", label: t("delivered"), date: order.created_at, icon: Check, show: status === "delivered" },
    { key: "out_for_delivery", label: t("out_for_delivery"), date: order.created_at, icon: Truck, show: status === "shipped" || status === "delivered" },
    { key: "shipped", label: t("shipped"), date: order.created_at, icon: Package, show: status === "shipped" || status === "delivered" },
    { key: "processed", label: t("order_processed"), date: order.created_at, icon: Package, show: true },
  ].filter((x) => x.show);

  return (
    <div className="min-h-[100dvh] bg-[#f8f7f6] text-[#181511] max-w-[430px] md:max-w-2xl mx-auto flex flex-col">
      <header className="flex items-center justify-between p-4 pb-2 sticky top-0 z-50 bg-[#f8f7f6]/80 backdrop-blur-md border-b border-[#e5e1da]">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="flex size-10 items-center justify-center rounded-full bg-white border border-[#e5e1da] shadow-sm"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="serif-font text-lg font-bold leading-tight">#{order.order_number || order.id}</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#897961]">{t("placed")} {formatPlaced(order.created_at)}</p>
          </div>
        </div>
        <button type="button" className="flex size-10 items-center justify-center rounded-full bg-white border border-[#e5e1da] shadow-sm" aria-label="Help">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
      </header>

      <main className="flex-1 pb-24">
        <section className="px-6 py-8">
          <h2 className="serif-font text-xl font-bold mb-8">{t("delivery_status")}</h2>
          <div className="relative flex flex-col gap-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-[#e5e1da]" />
            {timeline.map((step, idx) => (
              <div key={step.key} className="relative flex gap-4">
                <div className="relative z-10 size-6 rounded-full bg-[#ec9213] flex items-center justify-center ring-4 ring-[#f8f7f6] flex-shrink-0">
                  <step.icon className="size-3.5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">{step.label}</p>
                  <p className="text-xs text-[#897961]">{formatPlaced(step.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-4 bg-white/40">
          <h2 className="serif-font text-xl font-bold mb-4 px-2">{t("order_items")}</h2>
          <div className="grid grid-cols-2 gap-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-2">
                <div className="aspect-[4/5] rounded-xl overflow-hidden bg-white shadow-sm relative">
                  {item.product?.image_url ? (
                    <Image src={item.product.image_url} alt={item.product.name || ""} fill sizes="(max-width: 768px) 50vw, 200px" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#897961] bg-[#e5e1da]">
                      <Package className="size-10" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/90 backdrop-blur-md text-[10px] font-bold text-[#181511]">
                    QTY: {item.quantity}
                  </div>
                </div>
                <div>
                  <h3 className="serif-font text-sm font-bold text-[#181511] line-clamp-2">{item.product?.name || t("product")}</h3>
                  {item.product?.category_path && <p className="text-xs text-[#897961] mb-1">{item.product.category_path}</p>}
                  <p className="text-sm font-semibold text-[#ec9213]">AED {(item.quantity * item.price_at_purchase).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-8">
          <h2 className="serif-font text-xl font-bold mb-4">{t("summary")}</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#897961]">{t("subtotal")}</span>
              <span className="font-medium">AED {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#897961]">{t("shipping_label")}</span>
              <span className="font-medium">{shippingAmount === 0 ? t("complimentary") : `AED ${shippingAmount.toFixed(2)}`}</span>
            </div>
            <div className="pt-3 mt-3 border-t border-[#e5e1da] flex justify-between items-baseline">
              <span className="serif-font text-lg font-bold">{t("total")}</span>
              <span className="text-xl font-bold text-[#ec9213]">AED {order.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="px-6 py-4">
          <h2 className="serif-font text-xl font-bold mb-4">{t("shipping_details")}</h2>
          <div className="p-4 rounded-xl bg-white border border-[#e5e1da]">
            <div className="flex items-start gap-3">
              <MapPin className="size-5 text-[#897961] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-[#897961] leading-relaxed whitespace-pre-line">{order.shipping_address || "—"}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] md:max-w-2xl p-4 bg-[#f8f7f6]/80 backdrop-blur-xl border-t border-[#e5e1da] z-50">
        <button
          type="button"
          className="w-full bg-[#181511] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-[#2d2419] active:scale-[0.98] transition-transform"
        >
          {t("download_invoice")}
        </button>
      </div>
    </div>
  );
}
