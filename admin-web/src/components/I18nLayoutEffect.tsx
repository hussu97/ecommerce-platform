import { useEffect } from "react";
import { useI18nStore } from "../stores/useI18nStore";

/** Sets dir and lang on document for RTL support (Arabic). */
export function I18nLayoutEffect() {
  const currentLanguage = useI18nStore((s) => s.currentLanguage);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const dir = currentLanguage?.code === "ar" ? "rtl" : "ltr";
    const lang = currentLanguage?.code ?? "en";
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    };
  }, [currentLanguage?.code]);

  return null;
}
