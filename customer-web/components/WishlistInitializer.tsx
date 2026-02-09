"use client";

import { useEffect, useState } from "react";
import { useWishlistStore } from "@/stores/useWishlistStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function WishlistInitializer() {
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => setAuthHydrated(true));
    if (useAuthStore.persist?.hasHydrated?.()) {
      setAuthHydrated(true);
    }
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!authHydrated || !isAuthenticated) return;
    fetchWishlist();
  }, [fetchWishlist, isAuthenticated, authHydrated]);

  return null;
}
