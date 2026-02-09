import { create } from "zustand";
import api from "../lib/api";

export interface Language {
  id: number;
  code: string;
  name: string;
  is_default: boolean;
  sort_order: number;
}

interface I18nState {
  languages: Language[];
  strings: Record<string, string>;
  currentLanguage: Language | null;
  isLoading: boolean;
  fetchLanguages: () => Promise<void>;
  fetchStrings: (languageId?: number) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const DEFAULT_STRINGS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  orders: "Orders",
  brands: "Brands",
  add_product: "Add Product",
  add_brand: "Add Brand",
  sign_out: "Sign out",
  edit: "Edit",
  delete: "Delete",
  save: "Save",
  cancel: "Cancel",
  name: "Name",
  slug: "Slug",
  logo_url: "Logo URL",
  active: "Active",
  inactive: "Inactive",
  language: "Language",
};

const LANG_STORAGE_KEY = "admin_preferred_lang";

export const useI18nStore = create<I18nState>((set, get) => ({
  languages: [],
  strings: DEFAULT_STRINGS,
  currentLanguage: null,
  isLoading: false,

  fetchLanguages: async () => {
    try {
      const r = await api.get<Language[]>("/i18n/languages");
      set({ languages: r.data });
      const stored = typeof window !== "undefined" ? localStorage.getItem(LANG_STORAGE_KEY) : null;
      const lang = r.data.find((l) => l.code === stored) || r.data.find((l) => l.is_default) || r.data[0];
      if (lang && !get().currentLanguage) set({ currentLanguage: lang });
    } catch {
      set({ languages: [] });
    }
  },

  fetchStrings: async (languageId?: number) => {
    const id = languageId ?? get().currentLanguage?.id;
    if (!id) return;
    set({ isLoading: true });
    try {
      const r = await api.get<Record<string, string>>("/i18n/strings", {
        params: { language_id: id },
      });
      set({ strings: { ...DEFAULT_STRINGS, ...r.data } });
    } catch {
      set({ strings: DEFAULT_STRINGS });
    } finally {
      set({ isLoading: false });
    }
  },

  setLanguage: async (lang: Language) => {
    set({ currentLanguage: lang });
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, lang.code);
    }
    await get().fetchStrings(lang.id);
  },

  t: (key: string) => get().strings[key] ?? key,
}));
