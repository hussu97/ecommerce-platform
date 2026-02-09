"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";
import { useI18nStore } from "@/stores/useI18nStore";
import { Button } from "@/components/ui/Button";
import { Trash2, Plus, Minus, Loader2, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    fetchCart,
    isLoading,
  } = useCartStore();
  const t = useI18nStore((s) => s.t);
  const router = useRouter();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-[#ec9213]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-6">
        <h1 className="serif-font text-2xl font-bold text-[#181511]">
          {t("your_cart_empty")}
        </h1>
        <p className="text-[#897961] text-center">
          {t("your_cart_empty_hint")}
        </p>
        <Link href="/">
          <Button className="bg-[#ec9213] text-white rounded-full px-6">
            {t("start_shopping")}
          </Button>
        </Link>
      </div>
    );
  }

  const total = getCartTotal();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f7f6]">
      <header className="flex items-center bg-[#f8f7f6] p-4 pb-4 md:py-6 justify-between sticky top-0 z-50 border-b border-[#e5e1da]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center rounded-full size-10 bg-white shadow-sm text-[#181511]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="serif-font text-xl md:text-2xl font-bold leading-tight tracking-tight text-[#181511]">
            {t("shopping_bag")}
          </h2>
        </div>
      </header>

      <div className="flex flex-col md:grid md:grid-cols-[1fr,360px] md:gap-8 gap-4 px-4 py-2 mb-40 md:mb-8 md:py-6">
        <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 bg-white p-3 rounded-xl shadow-sm border border-[#e5e1da]"
          >
            <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-[#f8f7f6]">
              {item.product.image_url ? (
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#897961]">
                  {t("no_image")}
                </div>
              )}
            </div>
            <div className="flex flex-col flex-1 justify-between py-0.5 min-w-0">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <Link
                    href={`/products/${item.product.slug ?? item.product.id}`}
                    className="serif-font text-base font-bold text-[#181511] leading-tight line-clamp-2 hover:text-[#ec9213]"
                  >
                    {item.product.name}
                  </Link>
                  <button
                    onClick={() => removeFromCart(item.product.slug ?? item.product.id)}
                    className="text-[#897961] hover:text-[#181511] shrink-0"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
                <p className="text-xs text-[#897961] mt-0.5">
                  {item.product.category_path || item.product.brand_name || "-"}
                </p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-semibold text-[#ec9213]">
                  AED {item.product.price.toFixed(2)}
                </p>
                <div className="flex items-center gap-3 bg-[#f8f7f6] px-2 py-1 rounded-full">
                  <button
                    className="size-6 flex items-center justify-center rounded-full bg-white shadow-sm text-xs font-bold hover:bg-[#e5e1da]"
                    onClick={() => updateQuantity(item.product.slug ?? item.product.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="text-xs font-bold min-w-[1.5rem] text-center">
                    {item.quantity}
                  </span>
                  <button
                    className="size-6 flex items-center justify-center rounded-full bg-white shadow-sm text-xs font-bold hover:bg-[#e5e1da]"
                    onClick={() => updateQuantity(item.product.slug ?? item.product.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>

        {/* Order Summary - sticky on desktop */}
        <div className="mt-4 md:mt-0 md:sticky md:top-24 p-5 bg-white rounded-xl shadow-sm border border-[#e5e1da] h-fit">
          <h4 className="serif-font font-bold text-lg mb-4 text-[#181511]">
            {t("order_summary")}
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#897961]">{t("subtotal")}</span>
              <span className="font-medium">AED {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#897961]">{t("shipping")}</span>
              <span className="text-emerald-600 font-medium">{t("free")}</span>
            </div>
            <div className="pt-3 border-t border-[#e5e1da] flex justify-between items-center">
              <span className="serif-font font-bold text-lg">{t("total")}</span>
              <span className="text-xl font-bold text-[#ec9213]">
                AED {total.toFixed(2)}
              </span>
            </div>
          </div>
          {/* Desktop: CTA inside summary column */}
          <div className="hidden md:block mt-4">
            <Link href="/checkout" className="block w-full">
              <button className="w-full bg-[#ec9213] text-white py-4 rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg shadow-[#ec9213]/30">
                {t("proceed_to_checkout")}
              </button>
            </Link>
            <p className="text-center text-[10px] text-[#897961] mt-2 font-medium uppercase tracking-tighter">
              {t("secure_checkout")}
            </p>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA on mobile only */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] md:hidden bg-white/90 backdrop-blur-xl border-t border-[#e5e1da] px-6 py-8 z-50">
        <Link href="/checkout" className="block w-full">
          <button className="w-full bg-[#ec9213] text-white py-4 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg shadow-[#ec9213]/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
            <span>{t("proceed_to_checkout")}</span>
            <span>→</span>
          </button>
        </Link>
        <p className="text-center text-[10px] text-[#897961] mt-3 font-medium uppercase tracking-tighter">
          {t("secure_checkout")}
        </p>
      </div>
    </div>
  );
}
