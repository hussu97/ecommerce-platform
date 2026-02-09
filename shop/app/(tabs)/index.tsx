import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
  View,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import api from "@/lib/api";
import { useCartStore, Product } from "@/stores/useCartStore";
import { useWishlistStore } from "@/stores/useWishlistStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import { useColorScheme } from "@/components/useColorScheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FiltersModal, type FilterValues, type SortOption } from "@/components/FiltersModal";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton";

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

const CARD_WIDTH = Platform.OS === "web" ? 180 : (Dimensions.get("window").width - 16 * 3) / 2;
const CARD_PADDING = 12;
const CARD_CONTENT = CARD_WIDTH - CARD_PADDING * 2;

export default function ShopScreen() {
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
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const [wishlistSlug, setWishlistSlug] = useState<string | null>(null);
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addToCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getQuantityForProductAndChild = useCartStore((s) => s.getQuantityForProductAndChild);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const inWishlist = useWishlistStore((s) => s.inWishlist);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const removeFromWishlist = useWishlistStore((s) => s.removeFromWishlist);
  const t = useI18nStore((s) => s.t);
  const currentLanguage = useI18nStore((s) => s.currentLanguage);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
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
      const r = await api.get<ProductListResponse>(
        `/products/?${params.toString()}`
      );
      const data = r.data;
      const productList = Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data)
          ? data
          : [];
      const filterData =
        data?.filters && !Array.isArray(data)
          ? data.filters
          : { categories: [], brands: [], attributes: [] };
      setProducts(productList);
      setFilters(filterData);
    } catch {
      setProducts([]);
      setFilters({ categories: [], brands: [], attributes: [] });
    } finally {
      setLoading(false);
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

  const handleFiltersApply = (values: FilterValues) => {
    setSort(values.sort);
    setCategorySlug(values.categorySlug);
    setBrandSlug(values.brandSlug);
    setSelectedOptionIds(values.selectedOptionIds);
    setMinPrice(values.minPrice);
    setMaxPrice(values.maxPrice);
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleAddToCart = async (item: Product) => {
    const firstChild = item.children?.[0];
    if (!firstChild) return;
    const slug = item.slug ?? item.id;
    setAddingSlug(slug);
    try {
      await addToCart(item, firstChild.code);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : t("network_error");
      Alert.alert(t("add_to_cart"), msg);
    } finally {
      setAddingSlug(null);
    }
  };

  const handleUpdateQty = async (item: Product, newQty: number) => {
    const firstChild = item.children?.[0];
    if (!firstChild) return;
    const slug = (item.slug ?? item.id).toString();
    setAddingSlug(slug);
    try {
      await updateQuantity(slug, firstChild.code, newQty);
    } finally {
      setAddingSlug(null);
    }
  };

  const handleWishlistPress = async (item: Product) => {
    const slug = (item.slug ?? item.id).toString();
    if (!isAuthenticated) {
      Alert.alert(t("sign_in_to_save"), "", [
        { text: t("sign_in"), onPress: () => router.push("/login") },
        { text: t("cancel") ?? "Cancel", style: "cancel" },
      ]);
      return;
    }
    if (wishlistSlug) return;
    setWishlistSlug(slug);
    try {
      if (inWishlist(slug)) await removeFromWishlist(slug);
      else await addToWishlist(slug);
    } finally {
      setWishlistSlug(null);
    }
  };

  const renderItem = ({ item }: { item: Product }) => {
    const slug = (item.slug ?? item.id).toString();
    const isSingleSized =
      item.single_sized ??
      (item.children?.length === 1 && item.children[0]?.size_value === "single_size");
    const singleChild = isSingleSized ? item.children?.[0] : null;
    const childCode = singleChild?.code ?? "";
    const qty = singleChild ? getQuantityForProductAndChild(slug, childCode) : 0;
    const stockNet = singleChild?.stock_net ?? item.stock_net ?? 0;
    const isUpdating = addingSlug === slug;
    const hasRating = item.avg_rating != null || (item.rating_count ?? 0) > 0;
    const headerText = item.brand_name || item.name;
    const subheaderText = item.brand_name ? item.name : (item.category_path || t("brand"));

    if (isSingleSized && singleChild) {
      return (
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={() => router.push(`/product/${item.slug ?? item.id}`)}
            activeOpacity={0.9}
            style={styles.cardContentTap}
          >
            <View style={[styles.imageWrap, { backgroundColor: colors.surface }]}>
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.sandDivider + "40" }]}>
                  <Text style={[styles.noImageText, { color: colors.textMuted }]}>{t("no_image")}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.heartBtn, { backgroundColor: "rgba(255,255,255,0.9)" }]}
                onPress={() => handleWishlistPress(item)}
                disabled={wishlistSlug === slug}
              >
                <FontAwesome name={inWishlist(slug) ? "heart" : "heart-o"} size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={[styles.cardHeader, { fontFamily: FontFamily.serif, color: colors.text }]} numberOfLines={1}>
                {headerText}
              </Text>
              <Text style={[styles.cardSubheader, { color: colors.textMuted }]} numberOfLines={1}>
                {subheaderText}
              </Text>
              {hasRating && (
                <View style={styles.ratingRow}>
                  <Text style={[styles.ratingStar, { color: colors.primary }]}>{"\u2605"}</Text>
                  <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                    {item.avg_rating?.toFixed(1) ?? "-"} ({item.rating_count ?? 0})
                  </Text>
                </View>
              )}
              <Text style={[styles.price, { color: colors.primary }]}>
                AED {item.price.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
          {qty > 0 ? (
            <View style={[styles.qtyPill, { borderColor: colors.sandDivider, backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => handleUpdateQty(item, qty - 1)}
                disabled={isUpdating || qty <= 1}
              >
                <FontAwesome name="minus" size={14} color={colors.text} />
              </TouchableOpacity>
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.qtyLoader} />
              ) : (
                <Text style={[styles.qtyNum, { color: colors.text }]}>{qty}</Text>
              )}
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => handleUpdateQty(item, qty + 1)}
                disabled={isUpdating || qty >= stockNet || stockNet <= 0}
              >
                <FontAwesome name="plus" size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: colors.primary },
                (isUpdating || stockNet <= 0) && styles.addBtnDisabled,
              ]}
              onPress={() => handleAddToCart(item)}
              disabled={isUpdating || stockNet <= 0}
              activeOpacity={0.7}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>{t("add_to_cart")}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.card, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => router.push(`/product/${item.slug ?? item.id}`)}
          activeOpacity={0.9}
          style={styles.cardContentTap}
        >
          <View style={[styles.imageWrap, { backgroundColor: colors.surface }]}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.sandDivider + "40" }]}>
                <Text style={[styles.noImageText, { color: colors.textMuted }]}>{t("no_image")}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.heartBtn, { backgroundColor: "rgba(255,255,255,0.9)" }]}
              onPress={() => handleWishlistPress(item)}
              disabled={wishlistSlug === slug}
            >
              <FontAwesome name={inWishlist(slug) ? "heart" : "heart-o"} size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.cardTextBlock}>
            <Text style={[styles.cardHeader, { fontFamily: FontFamily.serif, color: colors.text }]} numberOfLines={1}>
              {headerText}
            </Text>
            <Text style={[styles.cardSubheader, { color: colors.textMuted }]} numberOfLines={1}>
              {subheaderText}
            </Text>
            {hasRating && (
              <View style={styles.ratingRow}>
                <Text style={[styles.ratingStar, { color: colors.primary }]}>{"\u2605"}</Text>
                <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                  {item.avg_rating?.toFixed(1) ?? "-"} ({item.rating_count ?? 0})
                </Text>
              </View>
            )}
            <Text style={[styles.price, { color: colors.primary }]}>
              AED {item.price.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/product/${item.slug ?? item.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.addBtnText}>{t("view_variants")}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && (products ?? []).length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.skeletonGrid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProducts} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <View key={i} style={styles.skeletonCardWrap}>
            <ProductCardSkeleton />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchProducts} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <View style={styles.greeting}>
        <Text style={[styles.greetingTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("welcome_title")}
        </Text>
        <Text style={[styles.greetingSub, { color: colors.textMuted }]}>
          {t("welcome_subtitle")}
        </Text>
      </View>

      <View style={styles.searchAndFiltersRow}>
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
          <FontAwesome name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t("search_placeholder")}
            placeholderTextColor={colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
          />
        </View>
        <TouchableOpacity
          style={[styles.filtersBtn, { borderColor: colors.sandDivider, backgroundColor: colors.surface }]}
          onPress={() => setFiltersVisible(true)}
        >
          <FontAwesome name="filter" size={18} color={colors.primary} />
          <Text style={[styles.filtersBtnText, { color: colors.text }]}>{t("filters")}</Text>
        </TouchableOpacity>
      </View>

      {/* Short category chips: quick filter; full options in Filters modal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            { borderColor: colors.sandDivider },
            !categorySlug && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => setCategorySlug(null)}
        >
          <Text
            style={[
              styles.chipText,
              { color: categorySlug ? colors.text : "#fff" },
              !categorySlug && styles.chipTextActive,
            ]}
          >
            {t("all")}
          </Text>
        </TouchableOpacity>
        {filters.categories.map((tax) => {
          const slug = tax.slug ?? String(tax.id);
          const isActive = categorySlug === slug;
          return (
            <TouchableOpacity
              key={tax.id}
              style={[
                styles.chip,
                { borderColor: colors.sandDivider },
                isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setCategorySlug(isActive ? null : slug)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? "#fff" : colors.text },
                  isActive && styles.chipTextActive,
                ]}
              >
                {tax.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FiltersModal
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        filters={filters}
        initialValues={{
          sort,
          categorySlug,
          brandSlug,
          selectedOptionIds,
          minPrice,
          maxPrice,
        }}
        resultCount={(products ?? []).length}
        onApply={handleFiltersApply}
      />

      <View style={[styles.hero, { backgroundColor: colors.sandDivider + "40" }]}>
        <Text style={[styles.heroTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("hero_title")}
        </Text>
        <Text style={[styles.heroSub, { color: colors.textMuted }]}>
          {t("hero_subtitle")}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
        {t("curated_for_you")}
      </Text>

      {(products ?? []).length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <FontAwesome name="shopping-bag" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("no_products_title")}</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("no_products_hint")}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {(products ?? []).map((item) => (
            <View key={item.id}>{renderItem({ item })}</View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  greeting: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  greetingTitle: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  greetingSub: { fontSize: 14 },
  searchAndFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  filtersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  filtersBtnText: { fontSize: 14, fontWeight: "600" },
  chipsScroll: { marginTop: 12, maxHeight: 44 },
  chipsContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontSize: 14 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  hero: {
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  heroTitle: { fontSize: 20, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  heroSub: { fontSize: 14, textAlign: "center" },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 18,
  },
  empty: {
    padding: 40,
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e1da",
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptyText: { fontSize: 14, marginTop: 8, textAlign: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: "space-between",
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  skeletonCardWrap: {
    width: CARD_WIDTH,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 0,
  },
  cardContentTap: { flex: 1 },
  imageWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#181511",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },
  noImageText: { fontSize: 12 },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextBlock: { marginTop: 8 },
  cardHeader: { fontSize: 14, fontWeight: "700" },
  cardSubheader: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  ratingStar: { fontSize: 12 },
  ratingText: { fontSize: 12, marginLeft: 4 },
  price: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  addBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9999,
    marginTop: 10,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 9999,
    marginTop: 10,
    overflow: "hidden",
  },
  qtyBtn: { padding: 10 },
  qtyNum: { fontSize: 14, fontWeight: "600", minWidth: 28, textAlign: "center" },
  qtyLoader: { paddingHorizontal: 12 },
});
