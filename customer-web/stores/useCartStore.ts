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
  stock_quantity: number;
  stock_net?: number;
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
  error: string | null;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productSlug: string) => Promise<void>;
  updateQuantity: (productSlug: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getItemCount: () => number;
  getQuantityForProduct: (productId: string) => number;
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

  addToCart: async (product, quantity = 1) => {
    try {
      const slug = product.slug ?? product.id;
      await api.post("/cart/items/", { product_slug: slug, quantity });
      await get().fetchCart();
    } catch (err) {
      console.error("Failed to add to cart", err);
      throw err;
    }
  },

  removeFromCart: async (productSlug: string) => {
    try {
      await api.delete(`/cart/items/${productSlug}`);
      set((state) => ({
        items: state.items.filter(
          (item) => (item.product?.slug ?? item.product_id) !== productSlug
        ),
      }));
    } catch (err) {
      console.error("Failed to remove from cart", err);
      await get().fetchCart();
    }
  },

  updateQuantity: async (productSlug: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeFromCart(productSlug);
      return;
    }
    try {
      await api.put(`/cart/items/${productSlug}`, { quantity });
      set((state) => ({
        items: state.items.map((item) =>
          (item.product?.slug ?? item.product_id) === productSlug
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

  getQuantityForProduct: (productId: string) => {
    const { items } = get();
    const item = items.find((i) => i.product_id === productId);
    return item?.quantity ?? 0;
  },
}));
