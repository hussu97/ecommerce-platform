"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { useI18nStore } from "@/stores/useI18nStore";

export type SortOption = "featured" | "newest" | "price_asc" | "price_desc";

export interface FilterValues {
  sort: SortOption;
  categorySlug: string | null;
  brandSlug: string | null;
  selectedOptionIds: number[];
  minPrice: number | null;
  maxPrice: number | null;
}

interface FilterCategory {
  id: number;
  name: string;
  slug?: string | null;
  count: number;
}

interface FilterBrand {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface FilterOption {
  id: number;
  value: string;
  count: number;
}

interface FilterAttribute {
  id: number;
  name: string;
  options: FilterOption[];
}

interface FiltersData {
  categories: FilterCategory[];
  brands: FilterBrand[];
  attributes: FilterAttribute[];
}

interface FiltersOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FiltersData;
  initialValues: FilterValues;
  resultCount: number;
  onApply: (values: FilterValues) => void;
}

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "featured", labelKey: "featured" },
  { value: "newest", labelKey: "newest" },
  { value: "price_asc", labelKey: "price_low_to_high" },
  { value: "price_desc", labelKey: "price_high_to_low" },
];

export function FiltersOverlay({
  isOpen,
  onClose,
  filters,
  initialValues,
  resultCount,
  onApply,
}: FiltersOverlayProps) {
  const t = useI18nStore((s) => s.t);
  const [sort, setSort] = useState<SortOption>(initialValues.sort);
  const [categorySlug, setCategorySlug] = useState<string | null>(initialValues.categorySlug);
  const [brandSlug, setBrandSlug] = useState<string | null>(initialValues.brandSlug);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>(initialValues.selectedOptionIds);
  const [minPrice, setMinPrice] = useState<string>(initialValues.minPrice != null ? String(initialValues.minPrice) : "");
  const [maxPrice, setMaxPrice] = useState<string>(initialValues.maxPrice != null ? String(initialValues.maxPrice) : "");

  useEffect(() => {
    if (isOpen) {
      setSort(initialValues.sort);
      setCategorySlug(initialValues.categorySlug);
      setBrandSlug(initialValues.brandSlug);
      setSelectedOptionIds(initialValues.selectedOptionIds);
      setMinPrice(initialValues.minPrice != null ? String(initialValues.minPrice) : "");
      setMaxPrice(initialValues.maxPrice != null ? String(initialValues.maxPrice) : "");
    }
  }, [isOpen, initialValues.sort, initialValues.categorySlug, initialValues.brandSlug, initialValues.selectedOptionIds, initialValues.minPrice, initialValues.maxPrice]);

  const handleReset = () => {
    setSort("featured");
    setCategorySlug(null);
    setBrandSlug(null);
    setSelectedOptionIds([]);
    setMinPrice("");
    setMaxPrice("");
  };

  const handleApply = () => {
    onApply({
      sort,
      categorySlug,
      brandSlug,
      selectedOptionIds,
      minPrice: minPrice === "" ? null : parseFloat(minPrice) || null,
      maxPrice: maxPrice === "" ? null : parseFloat(maxPrice) || null,
    });
    onClose();
  };

  const toggleOption = (optId: number) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8f7f6] w-full max-w-[430px] md:max-w-lg md:max-h-[90vh] md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-2xl mx-auto md:my-auto left-1/2 -translate-x-1/2 shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center bg-[#f8f7f6]/80 backdrop-blur-md p-4 pt-6 justify-between border-b border-[#e5e1da] sticky top-0 z-10">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-10 rounded-full hover:bg-black/5"
        >
          <X className="size-5 text-[#181511]" />
        </button>
        <h1 className="serif-font text-xl font-semibold text-[#181511]">{t("filters")}</h1>
        <button
          type="button"
          onClick={handleReset}
          className="text-[#ec9213] text-sm font-semibold px-2"
        >
          {t("reset")}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {/* Sort By */}
        <section className="py-6 border-b border-[#e5e1da]">
          <h2 className="serif-font text-lg font-semibold mb-4 text-[#181511]">{t("sort_by")}</h2>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => {
              const isActive = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSort(opt.value)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#ec9213] text-white shadow-md shadow-[#ec9213]/20"
                      : "border border-[#e5e1da] bg-white text-[#181511]"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              );
            })}
          </div>
        </section>

        {/* Category */}
        <section className="py-6 border-b border-[#e5e1da]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="serif-font text-lg font-semibold text-[#181511]">{t("category")}</h2>
            <ChevronDown className="size-5 text-[#897961]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCategorySlug(null)}
              className={`flex items-center p-3 rounded-xl border text-left transition-all ${
                !categorySlug
                  ? "border-[#ec9213] bg-[#ec9213]/5"
                  : "border-[#e5e1da] bg-white"
              }`}
            >
              <span className="text-sm font-medium text-[#181511]">{t("all_categories")}</span>
              {!categorySlug && <Check className="size-5 text-[#ec9213] ml-auto shrink-0" />}
            </button>
            {filters.categories.map((c) => {
              const slug = c.slug ?? String(c.id);
              const isActive = categorySlug === slug;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategorySlug(isActive ? null : slug)}
                  className={`flex items-center p-3 rounded-xl border text-left transition-all ${
                    isActive ? "border-[#ec9213] bg-[#ec9213]/5" : "border-[#e5e1da] bg-white"
                  }`}
                >
                  <span className="text-sm font-medium text-[#181511]">{c.name}</span>
                  {isActive && <Check className="size-5 text-[#ec9213] ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Price Range */}
        <section className="py-6 border-b border-[#e5e1da]">
          <h2 className="serif-font text-lg font-semibold mb-6 text-[#181511]">{t("price_range")}</h2>
          <div className="px-2">
            <div className="flex justify-between gap-4 mt-4">
              <div className="flex-1 bg-white border border-[#e5e1da] rounded-lg px-4 py-2">
                <p className="text-[10px] text-[#897961] uppercase font-bold tracking-wider">{t("min_aed")}</p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="text-sm font-semibold w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                />
              </div>
              <div className="flex-1 bg-white border border-[#e5e1da] rounded-lg px-4 py-2">
                <p className="text-[10px] text-[#897961] uppercase font-bold tracking-wider">{t("max_aed")}</p>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="—"
                  className="text-sm font-semibold w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Brand */}
        <section className="py-6 border-b border-[#e5e1da]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="serif-font text-lg font-semibold text-[#181511]">{t("brand")}</h2>
            <span className="text-[#ec9213] text-sm font-medium">{t("see_all")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.brands.map((b) => {
              const isActive = brandSlug === b.slug;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBrandSlug(isActive ? null : b.slug)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#ec9213] text-white shadow-md shadow-[#ec9213]/20"
                      : "border border-[#e5e1da] bg-white text-[#181511]"
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Material / Attributes - horizontal scroll of options */}
        {filters.attributes.map((attr) => (
          <section key={attr.id} className="py-6 border-b border-[#e5e1da]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="serif-font text-lg font-semibold text-[#181511]">{attr.name}</h2>
              <ChevronDown className="size-5 text-[#897961]" />
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
              {attr.options.map((opt) => {
                const isActive = selectedOptionIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOption(opt.id)}
                    className="flex flex-col items-center gap-2 shrink-0"
                  >
                    <div
                      className={`size-14 rounded-full border-2 p-0.5 bg-[#e5e1da] ${
                        isActive ? "border-[#ec9213]" : "border-[#e5e1da]"
                      }`}
                    >
                      <div className="w-full h-full rounded-full bg-[#f8f7f6]" />
                    </div>
                    <span className="text-xs font-medium text-[#181511]">{opt.value}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 bg-[#f8f7f6]/95 backdrop-blur-xl p-4 pb-10 border-t border-[#e5e1da] flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <p className="text-[#897961] text-xs font-medium uppercase tracking-wider">{t("results")}</p>
          <p className="text-lg font-bold text-[#181511]">{resultCount} {t("items")}</p>
        </div>
        <button
          type="button"
          onClick={handleApply}
          className="bg-[#ec9213] hover:bg-[#ec9213]/90 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-[#ec9213]/30 flex-1"
        >
          {t("show_products")}
        </button>
      </footer>
    </div>
  );
}
