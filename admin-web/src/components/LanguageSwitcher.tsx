import { useEffect, useState } from "react";
import { useI18nStore } from "../stores/useI18nStore";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { languages, currentLanguage, fetchLanguages, setLanguage, t } = useI18nStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  if (languages.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-sand-divider/30 text-sm text-text-muted"
        aria-label={t("language")}
      >
        <Globe className="h-4 w-4" />
        <span>{currentLanguage?.code.toUpperCase() ?? "EN"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-xl shadow-lg border border-sand-divider z-50 min-w-[120px]">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => {
                  setLanguage(lang);
                  setOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-sand-divider/30 ${
                  currentLanguage?.id === lang.id ? "font-medium bg-primary/10 text-primary" : ""
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
