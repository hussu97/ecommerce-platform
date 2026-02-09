"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useI18nStore } from "@/stores/useI18nStore";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/lib/api";
import { CheckCircle, MapPin, Package, HelpCircle } from "lucide-react";

interface OrderItem {
  id: number;
  quantity: number;
  price_at_purchase: number;
  product?: { name: string; image_url?: string; category_path?: string };
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

function formatExpectedDelivery(createdAt: string): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 3);
  const d2 = new Date(d);
  d2.setDate(d2.getDate() + 2);
  const fmt = (x: Date) => x.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  return `${fmt(d)} - ${fmt(d2)}`;
}

export default function OrderSuccessPage() {
  const t = useI18nStore((s) => s.t);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId || !isAuthenticated) {
      setLoading(false);
      return;
    }
    api
      .get(`/orders/${orderId}`)
      .then((res) => setOrder(res.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-[#897961]">{t("processing")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-[430px] md:max-w-2xl mx-auto bg-[#f8f7f6] text-[#181511]">
      <header className="flex items-center justify-between px-6 pt-6 md:pt-8 pb-4">
        <Link href="/" className="size-10 flex items-center justify-center rounded-full bg-white border border-[#e5e1da] shadow-sm">
          <span className="sr-only">Close</span>
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Link>
        <span className="serif-font text-sm tracking-widest uppercase text-[#897961]">{t("order_status")}</span>
        <button type="button" className="size-10 flex items-center justify-center rounded-full bg-white border border-[#e5e1da] shadow-sm" aria-label="Share">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </header>

      <div className="flex flex-col items-center justify-center px-8 py-6 md:py-10">
        <div className="relative mb-6 md:mb-8">
          <div className="absolute inset-0 bg-[#ec9213]/20 blur-3xl rounded-full scale-150" />
          <div className="relative size-20 md:size-24 bg-white rounded-full flex items-center justify-center shadow-xl border border-[#ec9213]/10">
            <CheckCircle className="size-10 md:size-12 text-[#ec9213]" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="serif-font text-2xl md:text-3xl font-bold text-center leading-tight mb-2">{t("thank_you_order")}</h1>
        <p className="text-center text-[#897961] text-sm max-w-[280px] mx-auto leading-relaxed">
          {t("thank_you_desert_message")}
        </p>
      </div>

      {order && (
        <>
          <div className="px-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e5e1da]">
              <div className="flex justify-between items-center mb-6 border-b border-[#f1eee9] pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#897961] mb-1">{t("order_number")}</p>
                  <p className="font-mono text-sm font-semibold">#{order.order_number || order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-[#897961] mb-1">{t("expected_delivery")}</p>
                  <p className="serif-font text-sm font-bold text-[#ec9213]">{formatExpectedDelivery(order.created_at)}</p>
                </div>
              </div>
              <div className="space-y-4">
                {order.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-24 rounded-lg overflow-hidden bg-[#e5e1da] flex-shrink-0">
                      {item.product?.image_url ? (
                        <img src={item.product.image_url} alt={item.product.name || ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#897961] text-xs">—</div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <h3 className="serif-font text-sm font-bold truncate">{item.product?.name || "Product"}</h3>
                      {item.product?.category_path && (
                        <p className="text-[11px] text-[#897961] mb-1">{item.product.category_path}</p>
                      )}
                      <div className="flex justify-between items-end">
                        <p className="text-xs font-medium">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-[#ec9213]">AED {(item.quantity * item.price_at_purchase).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[#f1eee9] space-y-2">
                <div className="flex justify-between text-xs text-[#897961]">
                  <span>{t("subtotal")}</span>
                  <span>AED {order.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-[#897961]">
                  <span>{t("shipping_label")}</span>
                  <span className="text-green-600 font-medium">{t("complimentary")}</span>
                </div>
                <div className="flex justify-between text-base font-bold serif-font mt-2 pt-2">
                  <span>{t("total")}</span>
                  <span>AED {order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 mb-6 space-y-4">
            <h2 className="serif-font text-lg font-bold px-1">{t("delivery_address_heading")}</h2>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e5e1da] flex gap-4">
              <div className="size-10 rounded-full bg-[#e5e1da] flex items-center justify-center text-[#897961] flex-shrink-0">
                <MapPin className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#897961] leading-relaxed whitespace-pre-line">{order.shipping_address || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link href={`/orders/${order.id}`} className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-[#e5e1da] shadow-sm hover:bg-[#f8f7f6] transition-colors">
                <Package className="size-6 text-[#ec9213] mb-2" />
                <span className="text-xs font-semibold">{t("track_order")}</span>
              </Link>
              <button type="button" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-[#e5e1da] shadow-sm hover:bg-[#f8f7f6] transition-colors">
                <HelpCircle className="size-6 text-[#ec9213] mb-2" />
                <span className="text-xs font-semibold">{t("get_help")}</span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-auto pt-6 pb-8 px-6 md:pb-10 bg-gradient-to-t from-[#f8f7f6] via-[#f8f7f6]/95 to-transparent">
        <Link href="/" className="block">
          <Button className="w-full bg-[#181511] text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest shadow-xl hover:bg-[#2d2419] active:scale-[0.98] transition-transform">
            {t("back_to_home")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
