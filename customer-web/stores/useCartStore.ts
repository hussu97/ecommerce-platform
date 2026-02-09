import { create } from "zustand";
import api from "@/lib/api";

export interface Product {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  image_url?: string;
  description?: string;
  category_path?: string | null;
  brand_name?: string | null;
  attributes?: { attribute_name: string; value: string }[];
  stock_quantity?: number;
  stock_net?: number;
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
  error: string | null;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, childCode: string, quantity?: number) => Promise<void>;
  removeFromCart: (productSlug: string, childCode: string) => Promise<void>;
  updateQuantity: (productSlug: string, childCode: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getItemCount: () => number;
  getQuantityForProductAndChild: (productSlug: string, childCode: string) => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<CartItem[]>("/cart/");
      set({ items: response.data, error: null });
    } catch (err) {
      console.error("Failed to fetch cart", err);
      set({ items: [], error: "Failed to load cart" });
    } finally {
      set({ isLoading: false });
    }
  },

  addToCart: async (product, childCode, quantity = 1) => {
    try {
      const slug = product.slug ?? product.id;
      await api.post("/cart/items/", { product_slug: slug, child_code: childCode, quantity });
      await get().fetchCart();
    } catch (err) {
      console.error("Failed to add to cart", err);
      throw err;
    }
  },

  removeFromCart: async (productSlug: string, childCode: string) => {
    try {
      await api.delete(`/cart/items/${productSlug}/${encodeURIComponent(childCode)}`);
      set((state) => ({
        items: state.items.filter(
          (item) =>
            (item.product?.slug ?? item.product_id) !== productSlug ||
            item.child?.code !== childCode
        ),
      }));
    } catch (err) {
      console.error("Failed to remove from cart", err);
      await get().fetchCart();
    }
  },

  updateQuantity: async (productSlug: string, childCode: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeFromCart(productSlug, childCode);
      return;
    }
    try {
      await api.put(`/cart/items/${productSlug}/${encodeURIComponent(childCode)}`, { quantity });
      set((state) => ({
        items: state.items.map((item) =>
          (item.product?.slug ?? item.product_id) === productSlug && item.child?.code === childCode
            ? { ...item, quantity }
            : item
        ),
      }));
    } catch (err) {
      console.error("Failed to update quantity", err);
      await get().fetchCart();
    }
  },

  clearCart: async () => {
    try {
      await api.delete("/cart/");
      set({ items: [] });
    } catch (err) {
      console.error("Failed to clear cart", err);
      await get().fetchCart();
    }
  },

  getCartTotal: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },

  getQuantityForProductAndChild: (productSlug: string, childCode: string) => {
    const { items } = get();
    const item = items.find(
      (i) => (i.product?.slug ?? i.product_id) === productSlug && i.child?.code === childCode
    );
    return item?.quantity ?? 0;
  },
}));
