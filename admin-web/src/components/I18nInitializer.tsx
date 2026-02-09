import { useEffect } from "react";
import { useI18nStore } from "../stores/useI18nStore";

export function I18nInitializer() {
  const { fetchLanguages, fetchStrings, languages } = useI18nStore();

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    if (languages.length > 0) {
      const stored = typeof window !== "undefined" ? localStorage.getItem("admin_preferred_lang") : null;
      const lang = languages.find((l) => l.code === stored) || languages.find((l) => l.is_default) || languages[0];
      if (lang) {
        useI18nStore.setState({ currentLanguage: lang });
        fetchStrings(lang.id);
      }
    }
  }, [languages, fetchStrings]);

  return null;
}
