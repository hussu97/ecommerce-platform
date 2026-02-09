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
  children?: { id: number; code: string; size_value: string; stock_net: number }[];
  single_sized?: boolean;
}

export interface CartItemChild {
  id: number;
  code: string;
  size_value?: string | null;
  stock_net: number;
}

export interface CartItem {
  id: number;
  product_id: string;
  product_child_id: number;
  quantity: number;
  product: Product;
  child?: CartItemChild | null;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, childCode: string, quantity?: number) => Promise<void>;
  removeFromCart: (productSlug: string, childCode: string) => Promise<void>;
  updateQuantity: (productSlug: string, childCode: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemCount: () => number;
  getQuantityForProduct: (productId: string) => number;
  getQuantityForProductAndChild: (productSlug: string, childCode: string) => number;
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
  addToCart: async (product, childCode, quantity = 1) => {
    const slug = (product.slug ?? product.id ?? "").toString().trim();
    if (!slug) throw new Error("Product slug or id is required");
    await api.post("/cart/items", { product_slug: slug, child_code: childCode, quantity });
    await get().fetchCart();
  },
  removeFromCart: async (productSlug, childCode) => {
    await api.delete(`/cart/items/${productSlug}/${encodeURIComponent(childCode)}`);
    await get().fetchCart();
  },
  updateQuantity: async (productSlug, childCode, quantity) => {
    if (quantity <= 0) {
      await get().removeFromCart(productSlug, childCode);
      return;
    }
    try {
      await api.put(`/cart/items/${productSlug}/${encodeURIComponent(childCode)}`, { quantity });
      set((s) => ({
        items: s.items.map((i) =>
          (i.product?.slug ?? i.product_id) === productSlug && i.child?.code === childCode
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
    return get().items
      .filter((i) => i.product_id === productId || (i.product?.slug ?? i.product_id) === productId)
      .reduce((s, i) => s + i.quantity, 0);
  },
  getQuantityForProductAndChild: (productSlug, childCode) => {
    const item = get().items.find(
      (i) => (i.product?.slug ?? i.product_id) === productSlug && i.child?.code === childCode
    );
    return item?.quantity ?? 0;
  },
}));
