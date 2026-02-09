import { create } from "zustand";
import api from "@/lib/api";
import type { Product } from "./useCartStore";

interface WishlistState {
  items: Product[];
  isLoading: boolean;
  error: string | null;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productSlug: string) => Promise<void>;
  removeFromWishlist: (productSlug: string) => Promise<void>;
  moveToCart: (productSlug: string, childCode: string) => Promise<void>;
  inWishlist: (productSlug: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchWishlist: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Product[]>("/wishlist");
      set({ items: response.data ?? [], error: null });
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
      set({ items: [], error: "Failed to load wishlist" });
    } finally {
      set({ isLoading: false });
    }
  },

  addToWishlist: async (productSlug: string) => {
    try {
      await api.post("/wishlist", { product_slug: productSlug });
      await get().fetchWishlist();
    } catch (err) {
      console.error("Failed to add to wishlist", err);
      throw err;
    }
  },

  removeFromWishlist: async (productSlug: string) => {
    try {
      await api.delete(`/wishlist/${encodeURIComponent(productSlug)}`);
      set((state) => ({
        items: state.items.filter((p) => (p.slug ?? p.id) !== productSlug),
      }));
    } catch (err) {
      console.error("Failed to remove from wishlist", err);
      await get().fetchWishlist();
    }
  },

  moveToCart: async (productSlug: string, childCode: string) => {
    try {
      await api.post(`/wishlist/${encodeURIComponent(productSlug)}/move-to-cart`, {
        child_code: childCode,
      });
      set((state) => ({
        items: state.items.filter((p) => (p.slug ?? p.id) !== productSlug),
      }));
      const { useCartStore } = await import("./useCartStore");
      await useCartStore.getState().fetchCart();
    } catch (err) {
      console.error("Failed to move to cart", err);
      throw err;
    }
  },

  inWishlist: (productSlug: string) => {
    return get().items.some((p) => (p.slug ?? p.id) === productSlug);
  },
}));
