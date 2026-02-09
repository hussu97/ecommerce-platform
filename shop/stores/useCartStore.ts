import { create } from "zustand";
import api from "@/lib/api";

export interface Product {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  image_url?: string;
  description?: string;
  stock_quantity: number;
  stock_net?: number;
  category_path?: string | null;
  brand_name?: string | null;
  attributes?: { attribute_name: string; value: string }[];
  avg_rating?: number | null;
  rating_count?: number;
}

export interface CartItem {
  id: number;
  product_id: string;
  quantity: number;
  product: Product;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productSlug: string) => Promise<void>;
  updateQuantity: (productSlug: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemCount: () => number;
  getQuantityForProduct: (productId: string) => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<CartItem[]>("/cart/");
      set({ items: res.data });
    } catch {
      set({ items: [] });
    } finally {
      set({ isLoading: false });
    }
  },
  addToCart: async (product, quantity = 1) => {
    const slug = (product.slug ?? product.id ?? "").toString().trim();
    if (!slug) throw new Error("Product slug or id is required");
    await api.post("/cart/items", { product_slug: slug, quantity });
    await get().fetchCart();
  },
  removeFromCart: async (productSlug) => {
    await api.delete(`/cart/items/${productSlug}`);
    await get().fetchCart();
  },
  updateQuantity: async (productSlug, quantity) => {
    if (quantity <= 0) {
      await get().removeFromCart(productSlug);
      return;
    }
    try {
      await api.put(`/cart/items/${productSlug}`, { quantity });
      set((s) => ({
        items: s.items.map((i) =>
          (i.product?.slug ?? i.product_id) === productSlug
            ? { ...i, quantity }
            : i
        ),
      }));
    } catch {
      await get().fetchCart();
    }
  },
  clearCart: async () => {
    await api.delete("/cart/");
    set({ items: [] });
  },
  getItemCount: () => get().items.reduce((c, i) => c + i.quantity, 0),
  getQuantityForProduct: (productId) => {
    const item = get().items.find(
      (i) => i.product_id === productId || (i.product?.slug ?? i.product_id) === productId
    );
    return item?.quantity ?? 0;
  },
}));
