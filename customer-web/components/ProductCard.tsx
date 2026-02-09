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
  const getQuantityForProduct = useCartStore((state) => state.getQuantityForProduct);
  const productSlug = product.slug ?? product.id;
  const quantity = getQuantityForProduct(product.id);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAdd = async () => {
    setIsUpdating(true);
    try {
      await addToCart(product);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIncrease = async () => {
    setIsUpdating(true);
    try {
      await updateQuantity(productSlug, quantity + 1);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrease = async () => {
    if (quantity <= 1) return;
    setIsUpdating(true);
    try {
      await updateQuantity(productSlug, quantity - 1);
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
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#897961] bg-[#f8f7f6]">
              {t("no_image")}
            </div>
          )}
        </Link>
      </div>
      <div>
        <Link href={`/products/${productSlug}`} className="block">
          <h3 className="serif-font text-sm font-bold text-[#181511] line-clamp-1 hover:text-[#ec9213] transition-colors">
            {product.brand_name || product.name}
          </h3>
          <p className="text-xs text-[#897961] mb-1 line-clamp-2">{product.name}</p>
        </Link>
        {(product.avg_rating != null || (product.rating_count ?? 0) > 0) && (
          <div className="flex items-center text-sm text-[#897961] mb-1">
            <span className="text-[#ec9213]">★</span>
            <span className="ml-1">
              {product.avg_rating?.toFixed(1) ?? "-"} ({product.rating_count ?? 0})
            </span>
          </div>
        )}
        <p className="text-sm font-semibold text-[#ec9213]">
          AED {product.price.toFixed(2)}
        </p>
        {quantity > 0 ? (
          <div className="flex items-center justify-center w-full rounded-full border border-[#e5e1da] bg-[#f8f7f6] overflow-hidden mt-2">
            <button
              className="p-2 hover:bg-white/50 disabled:opacity-50"
              onClick={handleDecrease}
              disabled={isUpdating || quantity <= 1 || (product.stock_net ?? product.stock_quantity) <= 0}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 text-sm font-medium min-w-[2rem] text-center">
              {quantity}
            </span>
            <button
              className="p-2 hover:bg-white/50 disabled:opacity-50"
              onClick={handleIncrease}
              disabled={
                isUpdating ||
                quantity >= (product.stock_net ?? product.stock_quantity) ||
                (product.stock_net ?? product.stock_quantity) <= 0
              }
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            className="w-full rounded-full mt-2 bg-[#ec9213] text-white hover:bg-[#ec9213]/90 border-none shadow-md shadow-[#ec9213]/20"
            size="sm"
            onClick={handleAdd}
            disabled={isUpdating || (product.stock_net ?? product.stock_quantity) <= 0}
            isLoading={isUpdating}
          >
            {t("add_to_cart")}
          </Button>
        )}
      </div>
    </div>
  );
}
