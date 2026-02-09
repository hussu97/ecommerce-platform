import { useEffect } from "react";
import { useWishlistStore } from "@/stores/useWishlistStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function WishlistInitializer() {
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) fetchWishlist();
  }, [fetchWishlist, isAuthenticated]);

  return null;
}
