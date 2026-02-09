"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function CartInitializer() {
  const fetchCart = useCartStore((state) => state.fetchCart);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    // Wait for auth store to rehydrate so token is synced to localStorage before cart requests
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => setAuthHydrated(true));
    if (useAuthStore.persist?.hasHydrated?.()) {
      setAuthHydrated(true);
    }
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!authHydrated) return;
    fetchCart();
  }, [fetchCart, isAuthenticated, token, authHydrated]);

  return null;
}
