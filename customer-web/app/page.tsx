"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Product } from "@/stores/useCartStore";
import { ProductCard } from "@/components/ProductCard";
import { FiltersOverlay, type FilterValues, type SortOption } from "@/components/FiltersOverlay";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { Loader2, Search, Package, SlidersHorizontal } from "lucide-react";

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

interface ProductListResponse {
  products: Product[];
  filters: {
    categories: FilterCategory[];
    brands: FilterBrand[];
    attributes: FilterAttribute[];
  };
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ProductListResponse["filters"]>({
    categories: [],
    brands: [],
    attributes: [],
  });
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [brandSlug, setBrandSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortOption>("featured");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const t = useI18nStore((s) => s.t);
  const currentLanguage = useI18nStore((s) => s.currentLanguage);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (categorySlug) params.set("category_slug", categorySlug);
      if (brandSlug) params.set("brand_slug", brandSlug);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedOptionIds.length)
        params.set("option_ids", selectedOptionIds.join(","));
      if (sort && sort !== "featured") params.set("sort", sort);
      if (minPrice != null) params.set("min_price", String(minPrice));
      if (maxPrice != null) params.set("max_price", String(maxPrice));
      const response = await api.get<ProductListResponse>(
        `/products/?${params.toString()}`
      );
      setProducts(response.data.products);
      setFilters(response.data.filters);
    } catch (err) {
      console.error("Failed to fetch products", err);
      setError(t("failed_to_load_products"));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    categorySlug,
    brandSlug,
    searchQuery,
    selectedOptionIds,
    sort,
    minPrice,
    maxPrice,
    currentLanguage?.code,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleOption = (optId: number) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
    );
  };

  const handleFiltersApply = (values: FilterValues) => {
    setSort(values.sort);
    setCategorySlug(values.categorySlug);
    setBrandSlug(values.brandSlug);
    setSelectedOptionIds(values.selectedOptionIds);
    setMinPrice(values.minPrice);
    setMaxPrice(values.maxPrice);
  };

  const filterValues: FilterValues = {
    sort,
    categorySlug,
    brandSlug,
    selectedOptionIds,
    minPrice,
    maxPrice,
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f7f6]">
      {/* Search Bar - constrained width on desktop */}
      <div className="px-4 py-3 md:max-w-xl md:mx-auto md:w-full">
        <label className="flex flex-col min-w-40 h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm overflow-hidden">
            <div className="flex border-none bg-white items-center justify-center pl-4 rounded-l-xl text-[#897961]">
              <Search className="size-5" />
            </div>
            <input
              type="text"
              placeholder={t("search_placeholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-[#181511] bg-white border-none h-full placeholder:text-[#897961] px-4 pl-2 text-base font-normal focus:outline-none focus:ring-0"
            />
          </div>
        </label>
      </div>

      {/* Category Filters + Filters button - wrap on desktop */}
      <div className="flex items-center gap-2 px-4 py-2 md:flex-wrap md:gap-3">
        <div className="flex gap-3 overflow-x-auto no-scrollbar flex-1 min-w-0 md:flex-wrap md:overflow-visible">
          <button
            onClick={() => {
              setCategorySlug(null);
              setBrandSlug(null);
            }}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 text-sm font-medium transition-all ${
              !categorySlug && !brandSlug
                ? "bg-[#ec9213] text-white shadow-md shadow-[#ec9213]/20"
                : "bg-white border border-[#e5e1da] text-[#181511]"
            }`}
          >
            {t("all")}
          </button>
          {filters.categories.map((c) => {
            const slug = c.slug ?? String(c.id);
            const isActive = categorySlug === slug;
            return (
              <button
                key={c.id}
                onClick={() => setCategorySlug(isActive ? null : slug)}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#ec9213] text-white shadow-md shadow-[#ec9213]/20"
                    : "bg-white border border-[#e5e1da] text-[#181511]"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="flex h-9 shrink-0 items-center justify-center rounded-full px-4 bg-white border border-[#e5e1da] text-[#181511] hover:bg-[#f8f7f6]"
          aria-label={t("filters")}
        >
          <SlidersHorizontal className="size-4 mr-1" />
          <span className="text-sm font-medium">{t("filters")}</span>
        </button>
      </div>

      <FiltersOverlay
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        initialValues={filterValues}
        resultCount={products.length}
        onApply={handleFiltersApply}
      />

      {/* Hero Section - taller on desktop */}
      <div className="px-4 py-4 md:py-6">
        <div
          className="flex flex-col justify-end overflow-hidden rounded-xl min-h-64 md:min-h-80 lg:min-h-96 relative shadow-lg bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(24, 21, 17, 0.7) 0%, rgba(24, 21, 17, 0) 50%), url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200')",
          }}
        >
          <div className="p-6 md:p-8 lg:p-10 relative z-10">
            <span className="text-[#ec9213] text-xs font-bold tracking-widest uppercase mb-1 block">
              {t("new_arrival")}
            </span>
            <h1 className="text-white serif-font text-3xl font-bold leading-tight">
              {t("hero_title")}
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {t("hero_subtitle")}
            </p>
            <Link
              href="#products"
              className="inline-block mt-4 bg-white text-[#181511] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#ec9213] hover:text-white transition-colors"
            >
              {t("shop_now")}
            </Link>
          </div>
        </div>
      </div>

      {/* Curated Section */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 md:pt-6">
        <h2 className="serif-font text-xl md:text-2xl font-bold leading-tight tracking-tight text-[#181511]">
          {t("curated_for_you")}
        </h2>
        <button type="button" className="text-primary text-sm font-semibold">
          {t("view_all")}
        </button>
      </div>

      {/* Product Grid - 2 cols mobile, 3–4 desktop */}
      <div id="products" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-4 pb-24 md:pb-12">
        {isLoading ? (
          <div className="col-span-2 md:col-span-3 lg:col-span-4 flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#ec9213]" />
          </div>
        ) : error ? (
          <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-10 text-red-500">{error}</div>
        ) : products.length === 0 ? (
          <div className="col-span-2 md:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-[#e5e1da]">
            <Package className="h-16 w-16 text-[#897961] mb-4" />
            <h3 className="serif-font text-lg font-bold text-[#181511] mb-2">
              {t("no_products_title")}
            </h3>
            <p className="text-[#897961] text-center max-w-md text-sm">
              {t("no_products_hint")}
            </p>
          </div>
        ) : (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
}
