"use client";

import { useI18nStore } from "@/stores/useI18nStore";

export function Footer() {
  const t = useI18nStore((s) => s.t);

  return (
    <footer className="w-full bg-[#ec9213] text-white py-8 mt-auto border-t border-[#e5e1da]">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-6 text-center text-sm">
        <p>{t("footer_copyright")}</p>
      </div>
    </footer>
  );
}
