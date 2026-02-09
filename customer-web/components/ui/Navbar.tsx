"use client";

import Link from "next/link";
import { ShoppingBag, Search, User, Heart } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { useI18nStore } from "@/stores/useI18nStore";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";

export function Navbar() {
  const { user, isAuthenticated } = useAuthStore();
  const items = useCartStore((state) => state.items);
  const t = useI18nStore((s) => s.t);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex items-center bg-[#f8f7f6] p-4 pb-2 md:py-4 md:px-6 justify-between sticky top-0 z-50 border-b border-[#e5e1da]">
      {/* Mobile: greeting strip | Desktop: logo + nav */}
      <div className="flex items-center gap-3 md:gap-8">
        <Link
          href="/"
          className="serif-font text-lg md:text-xl font-bold leading-tight text-[#181511] shrink-0 hidden md:block"
        >
          7alaa
        </Link>
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href={isAuthenticated ? "/profile" : "/login"}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ec9213]/10 text-[#ec9213]"
          >
            <User className="size-5" />
          </Link>
          <div>
            <h2 className="serif-font text-lg font-bold leading-tight tracking-tight text-[#181511]">
              {isAuthenticated && user
                ? `${t("hello")}, ${user.full_name?.split(" ")[0] ?? t("profile")}`
                : t("welcome_title")}
            </h2>
            <p className="text-xs text-[#897961]">{t("welcome_subtitle")}</p>
          </div>
        </div>
        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-[#181511] hover:text-[#ec9213] transition-colors">
            {t("home")}
          </Link>
          <Link href="/orders" className="text-sm font-medium text-[#181511] hover:text-[#ec9213] transition-colors">
            {t("my_orders")}
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Link
          href="/"
          className="flex items-center justify-center rounded-full size-10 bg-transparent text-[#181511] hover:bg-black/5 md:hidden"
          aria-label={t("search")}
        >
          <Search className="size-5" />
        </Link>
        {isAuthenticated && (
          <Link
            href="/wishlist"
            className="flex items-center justify-center rounded-full size-10 bg-transparent text-[#181511] hover:bg-black/5"
            aria-label={t("wishlist")}
          >
            <Heart className="size-5" />
          </Link>
        )}
        <Link
          href="/cart"
          className="relative flex items-center justify-center rounded-full size-10 bg-transparent text-[#181511] hover:bg-black/5"
          aria-label={t("cart")}
        >
          <ShoppingBag className="size-5" />
          {mounted && itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[#ec9213] text-white text-[10px] font-bold flex items-center justify-center">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </Link>
        <Link
          href={isAuthenticated ? "/profile" : "/login"}
          className="hidden md:flex items-center justify-center rounded-full size-10 bg-[#ec9213]/10 text-[#ec9213] hover:bg-[#ec9213]/20"
          aria-label={t("account")}
        >
          <User className="size-5" />
        </Link>
        <div className="[&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:size-10 [&_button]:bg-transparent [&_button]:text-[#181511] [&_button]:hover:bg-black/5">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
