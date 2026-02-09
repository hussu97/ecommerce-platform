"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Product, useCartStore } from "@/stores/useCartStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { PdpSkeleton } from "@/components/PdpSkeleton";
import { Loader2, Plus, Minus, Star, ArrowLeft, Truck } from "lucide-react";

interface Review {
  id: number;
  rating: number;
  comment?: string;
  purchased_at?: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getQuantityForProductAndChild = useCartStore((state) => state.getQuantityForProductAndChild);

  type Child = { id: number; code: string; size_value: string; stock_net: number };
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const slug = product?.slug ?? product?.id ?? "";
  const quantity = product && selectedChild ? getQuantityForProductAndChild(slug, selectedChild.code) : 0;
  const children = product?.children ?? [];
  const singleSized = product?.single_sized ?? false;
  const showSizeSelector = !singleSized && children.length > 0 && (children.length > 1 || (children[0] && children[0].size_value !== "single_size"));

  useEffect(() => {
    if (product?.single_sized && product?.children?.length) {
      setSelectedChild(product.children[0]);
    } else if (product) {
      setSelectedChild(null);
    }
  }, [product?.id, product?.children, product?.single_sized]);
  const t = useI18nStore((s) => s.t);
  const currentLanguage = useI18nStore((s) => s.currentLanguage);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const response = await api.get(`/products/${id}`);
        setProduct(response.data);
      } catch (err) {
        console.error("Failed to fetch product", err);
        setError(t("failed_to_load_product"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, currentLanguage?.code]);

  useEffect(() => {
    if (!product?.slug && !product?.id) return;
    const slug = product.slug ?? product.id;
    api.get<Review[]>(`/products/${slug}/reviews`).then((r) => setReviews(Array.isArray(r.data) ? r.data : [])).catch(() => setReviews([]));
  }, [product?.slug, product?.id]);

  const handleAdd = async () => {
    if (!product || !selectedChild) return;
    setIsUpdating(true);
    try {
      await addToCart(product, selectedChild.code);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIncrease = async () => {
    if (!product || !selectedChild) return;
    setIsUpdating(true);
    try {
      await updateQuantity(slug, selectedChild.code, quantity + 1);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrease = async () => {
    if (!product || !selectedChild || quantity <= 1) return;
    setIsUpdating(true);
    try {
      await updateQuantity(slug, selectedChild.code, quantity - 1);
    } finally {
      setIsUpdating(false);
    }
  };

  const stockForSelected = selectedChild?.stock_net ?? product?.stock_net ?? 0;

  const scrollToSizes = () => {
    document.getElementById("pdp-sizes")?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) {
    return <PdpSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-red-500">
        {error || t("product_not_found")}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f7f6] md:min-h-0 scroll-smooth">
      {/* Back: mobile floating | desktop inline */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-6 md:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-full size-10 bg-white/80 backdrop-blur-md text-[#181511] shadow-sm"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex gap-2">
          <button className="flex items-center justify-center rounded-full size-10 bg-white/80 backdrop-blur-md text-[#181511] shadow-sm">
            <Star className="size-5" />
          </button>
        </div>
      </div>

      {/* Desktop: two columns | Mobile: stacked */}
      <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start md:py-8 md:max-w-6xl md:mx-auto md:w-full md:px-4">
        {/* Image column */}
        <div className="relative w-full aspect-[4/5] md:aspect-square md:sticky md:top-24 bg-white overflow-hidden rounded-xl md:rounded-2xl">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#897961] bg-[#f8f7f6]">
              {t("no_image_available")}
            </div>
          )}
        </div>

        {/* Content column - slides over image on mobile; smooth scroll */}
        <div className="relative -mt-8 md:mt-0 bg-[#f8f7f6] rounded-t-3xl md:rounded-none px-6 pt-8 pb-32 md:pb-8 flex flex-col gap-8 transition-shadow duration-300 shadow-[0_-4px_20px_rgba(24,21,17,0.06)] md:shadow-none">
        <button
          type="button"
          onClick={() => router.back()}
          className="hidden md:flex items-center gap-2 text-[#897961] hover:text-[#181511] text-sm font-medium -mt-2 mb-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[#897961] text-xs font-semibold tracking-widest uppercase">
              {product.category_path || product.brand_name || t("product")}
            </span>
            {(product.avg_rating != null || (product.rating_count ?? 0) > 0) && (
              <div className="flex items-center gap-1 text-[#ec9213]">
                <Star className="size-4 fill-current" />
                <span className="text-xs font-bold">
                  {product.avg_rating?.toFixed(1) ?? "-"} ({(product.rating_count ?? 0)} {t("reviews")})
                </span>
              </div>
            )}
          </div>
          <h1 className="serif-font text-3xl font-bold leading-tight text-[#181511] mt-1">
            {product.name}
          </h1>
          <p className="text-2xl font-semibold text-[#ec9213]">
            AED {product.price.toFixed(2)}
          </p>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-3">
          <h3 className="serif-font text-lg font-semibold text-[#181511]">
            {t("description")}
          </h3>
          <p className="text-sm leading-relaxed text-[#5a4e3f]">
            {product.description || t("no_description")}
          </p>
        </div>

        {/* Specifications (attributes) */}
        {product.attributes && product.attributes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-[#e5e1da] flex flex-col gap-4">
            <h3 className="serif-font text-base font-bold text-[#181511] border-b border-[#e5e1da] pb-3">
              {t("specifications")}
            </h3>
            <div className="grid grid-cols-2 gap-y-4">
              {product.attributes.map((a) => (
                <div key={a.attribute_name} className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#897961] uppercase font-bold tracking-tight">
                    {a.attribute_name}
                  </span>
                  <span className="text-sm font-medium text-[#181511]">{a.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Size selector (when multiple sizes and not single-sized) */}
        {showSizeSelector && children.length > 0 && (
          <div id="pdp-sizes" className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#897961] uppercase tracking-wide">{t("size")}</span>
            <div className="flex flex-wrap gap-2">
              {children.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChild(ch)}
                  disabled={ch.stock_net <= 0}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                    selectedChild?.id === ch.id
                      ? "border-[#ec9213] bg-[#ec9213]/10 text-[#181511]"
                      : "border-[#e5e1da] bg-white text-[#5a4e3f] hover:border-[#897961] disabled:opacity-50"
                  }`}
                >
                  {ch.size_value}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delivery */}
        <div className="flex items-center gap-4 py-2 border-t border-b border-[#e5e1da]">
          <div className="flex items-center justify-center size-10 rounded-full bg-[#e5e1da]/30 text-[#ec9213]">
            <Truck className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#181511]">
              {stockForSelected > 0 ? t("complimentary_delivery") : t("out_of_stock")}
            </span>
            <span className="text-[11px] text-[#897961]">
              {stockForSelected > 0 ? t("delivery_expected_uae") : ""}
            </span>
          </div>
        </div>

        {/* Add to cart: inline on desktop, hidden on mobile (fixed bar shown below) */}
        <div className="hidden md:flex items-center gap-4 pt-4">
          {(singleSized || selectedChild) && (
            <div className="flex items-center bg-[#e5e1da] rounded-full h-12 px-2">
              <button
                className="size-8 flex items-center justify-center text-[#897961] disabled:opacity-50"
                onClick={handleDecrease}
                disabled={isUpdating || quantity <= 1 || stockForSelected <= 0}
              >
                <Minus className="size-5" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{quantity}</span>
              <button
                className="size-8 flex items-center justify-center text-[#181511] disabled:opacity-50"
                onClick={handleIncrease}
                disabled={isUpdating || quantity >= stockForSelected || stockForSelected <= 0}
              >
                <Plus className="size-5" />
              </button>
            </div>
          )}
          {singleSized || selectedChild ? (
            <Button
              className="min-w-[200px] bg-[#ec9213] text-white h-12 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg shadow-[#ec9213]/30"
              onClick={handleAdd}
              disabled={isUpdating || stockForSelected <= 0 || !selectedChild}
              isLoading={isUpdating}
            >
              {t("add_to_cart")}
            </Button>
          ) : (
            <Button
              className="min-w-[200px] bg-[#ec9213] text-white h-12 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg shadow-[#ec9213]/30"
              onClick={scrollToSizes}
            >
              {t("select_size")}
            </Button>
          )}
        </div>
        </div>
      </div>

      {/* Add to cart: fixed bottom on mobile only */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] md:hidden bg-white/90 backdrop-blur-xl border-t border-[#e5e1da] px-6 py-5 flex items-center gap-4 z-50">
        {(singleSized || selectedChild) && (
          <div className="flex items-center bg-[#e5e1da] rounded-full h-12 px-2">
            <button
              className="size-8 flex items-center justify-center text-[#897961] disabled:opacity-50"
              onClick={handleDecrease}
              disabled={isUpdating || quantity <= 1 || stockForSelected <= 0}
            >
              <Minus className="size-5" />
            </button>
            <span className="w-8 text-center text-sm font-bold">{quantity}</span>
            <button
              className="size-8 flex items-center justify-center text-[#181511] disabled:opacity-50"
              onClick={handleIncrease}
              disabled={isUpdating || quantity >= stockForSelected || stockForSelected <= 0}
            >
              <Plus className="size-5" />
            </button>
          </div>
        )}
        {singleSized || selectedChild ? (
          <Button
            className="flex-1 bg-[#ec9213] text-white h-12 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg shadow-[#ec9213]/30"
            onClick={handleAdd}
            disabled={isUpdating || stockForSelected <= 0 || !selectedChild}
            isLoading={isUpdating}
          >
            {t("add_to_cart")}
          </Button>
        ) : (
          <Button
            className="flex-1 bg-[#ec9213] text-white h-12 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg shadow-[#ec9213]/30"
            onClick={scrollToSizes}
          >
            {t("select_size")}
          </Button>
        )}
      </div>

      {/* Reviews section */}
      {reviews.length > 0 && (
        <div className="px-6 pb-24 pt-4 border-t border-[#e5e1da]">
          <h2 className="serif-font text-xl font-bold text-[#181511] mb-4">
            {t("reviews_heading")}
          </h2>
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white rounded-xl p-4 border border-[#e5e1da]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-5 ${s <= rev.rating ? "fill-[#ec9213] text-[#ec9213]" : "text-[#e5e1da]"}`}
                      />
                    ))}
                  </div>
                  {rev.purchased_at && (
                    <span className="text-sm text-[#897961]">
                      {new Date(rev.purchased_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {rev.comment && <p className="text-[#5a4e3f]">{rev.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
