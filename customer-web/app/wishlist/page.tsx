"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWishlistStore } from "@/stores/useWishlistStore";
import { useI18nStore } from "@/stores/useI18nStore";
import type { Product } from "@/stores/useCartStore";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/PageLoader";
import { ArrowLeft, Heart } from "lucide-react";

export default function WishlistPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, isLoading, fetchWishlist, removeFromWishlist, moveToCart } = useWishlistStore();
  const t = useI18nStore((s) => s.t);
  const [movingSlug, setMovingSlug] = useState<string | null>(null);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [selectedChildBySlug, setSelectedChildBySlug] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated) fetchWishlist();
  }, [isAuthenticated, fetchWishlist]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-6">
        <h1 className="serif-font text-2xl font-bold text-[#181511]">
          {t("my_wishlist")}
        </h1>
        <p className="text-[#897961] text-center">
          {t("sign_in_to_save")}
        </p>
        <Link href="/login">
          <Button className="bg-[#ec9213] text-white rounded-full px-6">
            {t("sign_in")}
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return <PageLoader className="min-h-[60vh]" />;
  }

  if (items.length === 0) {
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
              {t("my_wishlist")}
            </h2>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 space-y-4 px-6">
          <h2 className="serif-font text-2xl font-bold text-[#181511]">
            {t("wishlist_empty")}
          </h2>
          <p className="text-[#897961] text-center">
            {t("wishlist_empty_hint")}
          </p>
          <Link href="/">
            <Button className="bg-[#ec9213] text-white rounded-full px-6">
              {t("shop_now")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleRemove = async (slug: string) => {
    setRemovingSlug(slug);
    try {
      await removeFromWishlist(slug);
    } finally {
      setRemovingSlug(null);
    }
  };

  const handleMoveToBag = async (product: Product) => {
    const slug = product.slug ?? product.id;
    const isSingle = product.single_sized ?? (product.children?.length === 1);
    const childCode = isSingle
      ? product.children?.[0]?.code
      : selectedChildBySlug[slug];
    if (!childCode) return;
    setMovingSlug(slug);
    try {
      await moveToCart(slug, childCode);
    } finally {
      setMovingSlug(null);
    }
  };

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
            {t("my_wishlist")}
          </h2>
        </div>
      </header>

      <main className="p-4 pb-24 md:pb-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
          {items.map((product) => {
            const slug = product.slug ?? product.id;
            const isSingle = product.single_sized ?? (product.children?.length === 1);
            const singleChild = isSingle ? product.children?.[0] : null;
            const children = product.children ?? [];
            const selectedCode = selectedChildBySlug[slug] ?? singleChild?.code;
            const selectedChild = children.find((c) => c.code === selectedCode);
            const stock = selectedChild?.stock_net ?? singleChild?.stock_net ?? 0;
            const canMoveToBag = isSingle ? singleChild && singleChild.stock_net > 0 : selectedChild && selectedChild.stock_net > 0;

            return (
              <div key={slug} className="flex flex-col">
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white shadow-sm border border-[#e5e1da] group">
                  <Link href={`/products/${slug}`} className="block w-full h-full">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#897961] bg-[#f8f7f6] text-sm">
                        {t("no_image")}
                      </div>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemove(slug)}
                    disabled={removingSlug === slug}
                    className="absolute top-2 right-2 size-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-[#181511] disabled:opacity-50"
                    aria-label={t("remove_from_wishlist")}
                  >
                    <Heart className="size-5 fill-[#ec9213] text-[#ec9213]" />
                  </button>
                </div>
                <div className="mt-3 px-1">
                  <p className="text-[10px] uppercase tracking-widest text-[#897961] font-sans mb-1">
                    {product.brand_name || t("product")}
                  </p>
                  <Link href={`/products/${slug}`}>
                    <h3 className="text-sm font-medium leading-tight text-[#181511] line-clamp-2 hover:text-[#ec9213]">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-1 text-sm font-bold text-[#ec9213]">
                    AED {product.price.toFixed(2)}
                  </p>
                  {!isSingle && children.length > 1 && (
                    <div className="mt-2">
                      <label className="text-[10px] uppercase tracking-wider text-[#897961] block mb-1">
                        {t("size")}
                      </label>
                      <select
                        value={selectedCode ?? ""}
                        onChange={(e) =>
                          setSelectedChildBySlug((prev) => ({
                            ...prev,
                            [slug]: e.target.value,
                          }))
                        }
                        className="w-full py-2 px-3 rounded-lg border border-[#e5e1da] text-sm bg-white text-[#181511]"
                      >
                        <option value="">{t("select_size")}</option>
                        {children.map((ch) => (
                          <option
                            key={ch.code}
                            value={ch.code}
                            disabled={ch.stock_net <= 0}
                          >
                            {ch.size_value}
                            {ch.stock_net <= 0 ? ` (${t("out_of_stock")})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button
                    className="mt-3 w-full py-2 rounded-full text-sm font-bold bg-[#ec9213] text-white hover:bg-[#ec9213]/90 disabled:opacity-50"
                    onClick={() => handleMoveToBag(product)}
                    disabled={!canMoveToBag || movingSlug === slug}
                    isLoading={movingSlug === slug}
                  >
                    {t("move_to_bag")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
