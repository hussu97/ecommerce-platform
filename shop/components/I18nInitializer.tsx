import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18nStore } from "@/stores/useI18nStore";

const LANG_STORAGE_KEY = "preferred_lang";

export function I18nInitializer() {
  const { fetchLanguages, fetchStrings, languages } = useI18nStore();

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  useEffect(() => {
    if (languages.length === 0) return;
    (async () => {
      const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
      const lang =
        languages.find((l) => l.code === stored) ||
        languages.find((l) => l.is_default) ||
        languages[0];
      if (lang) {
        useI18nStore.setState({ currentLanguage: lang });
        await fetchStrings(lang.code);
      }
    })();
  }, [languages, fetchStrings]);

  return null;
}
