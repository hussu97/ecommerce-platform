"use client";

import Link from "next/link";
import { Product, useCartStore } from "@/stores/useCartStore";
import { useI18nStore } from "@/stores/useI18nStore";
import { Button } from "@/components/ui/Button";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const t = useI18nStore((s) => s.t);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getQuantityForProductAndChild = useCartStore((state) => state.getQuantityForProductAndChild);
  const productSlug = product.slug ?? product.id;
  const isSingleSized =
    product.single_sized ??
    (product.children?.length === 1 && product.children[0]?.size_value === "single_size");
  const singleChild = isSingleSized ? product.children?.[0] : null;
  const childCode = singleChild?.code ?? "";
  const quantity = singleChild ? getQuantityForProductAndChild(productSlug, childCode) : 0;
  const [isUpdating, setIsUpdating] = useState(false);
  const stockNet = singleChild?.stock_net ?? product.stock_net ?? product.stock_quantity ?? 0;

  const handleAdd = async () => {
    if (!singleChild) return;
    setIsUpdating(true);
    try {
      await addToCart(product, singleChild.code);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIncrease = async () => {
    if (!singleChild) return;
    setIsUpdating(true);
    try {
      await updateQuantity(productSlug, singleChild.code, quantity + 1);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrease = async () => {
    if (!singleChild || quantity <= 1) return;
    setIsUpdating(true);
    try {
      await updateQuantity(productSlug, singleChild.code, quantity - 1);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[4/5] rounded-xl overflow-hidden bg-white shadow-sm relative group">
        <Link href={`/products/${productSlug}`} className="block w-full h-full">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted bg-background-light">
              {t("no_image")}
            </div>
          )}
        </Link>
      </div>
      <div>
        <Link href={`/products/${productSlug}`} className="block">
          <h3 className="serif-font text-sm font-bold text-text-primary line-clamp-1 hover:text-primary transition-colors">
            {product.brand_name || product.name}
          </h3>
          <p className="text-xs text-text-muted mb-1 line-clamp-2">{product.name}</p>
        </Link>
        {(product.avg_rating != null || (product.rating_count ?? 0) > 0) && (
          <div className="flex items-center text-sm text-text-muted mb-1">
            <span className="text-primary">★</span>
            <span className="ml-1">
              {product.avg_rating?.toFixed(1) ?? "-"} ({product.rating_count ?? 0})
            </span>
          </div>
        )}
        <p className="text-sm font-semibold text-primary">
          AED {product.price.toFixed(2)}
        </p>
        {isSingleSized && singleChild ? (
          quantity > 0 ? (
            <div className="flex items-center justify-center w-full rounded-full border border-sand-divider bg-background-light overflow-hidden mt-2">
              <button
                className="p-2 hover:bg-white/50 disabled:opacity-50"
                onClick={handleDecrease}
                disabled={isUpdating || quantity <= 1 || stockNet <= 0}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 text-sm font-medium min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                className="p-2 hover:bg-white/50 disabled:opacity-50"
                onClick={handleIncrease}
                disabled={isUpdating || quantity >= stockNet || stockNet <= 0}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              className="w-full rounded-full mt-2 bg-primary text-white hover:bg-primary/90 border-none shadow-md shadow-primary/20 active:scale-[0.98] transition-transform"
              size="sm"
              onClick={handleAdd}
              disabled={isUpdating || stockNet <= 0}
              isLoading={isUpdating}
            >
              {t("add_to_cart")}
            </Button>
          )
        ) : (
          <Link href={`/products/${productSlug}`} className="block mt-2">
            <Button
              className="w-full rounded-full bg-primary text-white hover:bg-primary/90 border-none shadow-md shadow-primary/20"
              size="sm"
            >
              {t("view_variants")}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
