"use client";

import { useEffect, useState } from "react";
import { useI18nStore } from "@/stores/useI18nStore";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { languages, currentLanguage, fetchLanguages, setLanguage, t } = useI18nStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-sm"
        aria-label={t("language")}
      >
        <Globe className="h-4 w-4" />
        <span>{currentLanguage?.code.toUpperCase() ?? "EN"}</span>
      </button>
      {open && languages.length >= 1 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-md shadow-lg z-50 min-w-[120px] text-gray-900">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => {
                  setLanguage(lang);
                  setOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  currentLanguage?.id === lang.id ? "font-medium bg-gray-50" : ""
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
