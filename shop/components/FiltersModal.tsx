import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useI18nStore } from "@/stores/useI18nStore";
import { useColorScheme } from "@/components/useColorScheme";

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

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "featured", labelKey: "featured" },
  { value: "newest", labelKey: "newest" },
  { value: "price_asc", labelKey: "price_low_to_high" },
  { value: "price_desc", labelKey: "price_high_to_low" },
];

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FiltersData;
  initialValues: FilterValues;
  resultCount: number;
  onApply: (values: FilterValues) => void;
}

export function FiltersModal({
  visible,
  onClose,
  filters,
  initialValues,
  resultCount,
  onApply,
}: FiltersModalProps) {
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [sort, setSort] = useState<SortOption>(initialValues.sort);
  const [categorySlug, setCategorySlug] = useState<string | null>(initialValues.categorySlug);
  const [brandSlug, setBrandSlug] = useState<string | null>(initialValues.brandSlug);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>(initialValues.selectedOptionIds);
  const [minPrice, setMinPrice] = useState<string>(
    initialValues.minPrice != null ? String(initialValues.minPrice) : ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    initialValues.maxPrice != null ? String(initialValues.maxPrice) : ""
  );

  useEffect(() => {
    if (visible) {
      setSort(initialValues.sort);
      setCategorySlug(initialValues.categorySlug);
      setBrandSlug(initialValues.brandSlug);
      setSelectedOptionIds(initialValues.selectedOptionIds);
      setMinPrice(initialValues.minPrice != null ? String(initialValues.minPrice) : "");
      setMaxPrice(initialValues.maxPrice != null ? String(initialValues.maxPrice) : "");
    }
  }, [
    visible,
    initialValues.sort,
    initialValues.categorySlug,
    initialValues.brandSlug,
    initialValues.selectedOptionIds,
    initialValues.minPrice,
    initialValues.maxPrice,
  ]);

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

  const sectionTitle = [styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }];
  const pill = (isActive: boolean) => ({
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: isActive ? colors.primary : colors.sandDivider,
    backgroundColor: isActive ? colors.primary : colors.surface,
  });
  const pillText = (isActive: boolean) => ({
    fontSize: 14,
    fontWeight: "500",
    color: isActive ? "#fff" : colors.text,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.sandDivider }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={12}>
            <FontAwesome name="times" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
            {t("filters")}
          </Text>
          <TouchableOpacity onPress={handleReset} style={styles.headerBtn} hitSlop={12}>
            <Text style={[styles.resetText, { color: colors.primary }]}>{t("reset")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sort By */}
          <View style={[styles.section, { borderBottomColor: colors.sandDivider }]}>
            <Text style={sectionTitle}>{t("sort_by")}</Text>
            <View style={styles.pillRow}>
              {SORT_OPTIONS.map((opt) => {
                const isActive = sort === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pillWrap, pill(isActive)]}
                    onPress={() => setSort(opt.value)}
                  >
                    <Text style={pillText(isActive)}>{t(opt.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View style={[styles.section, { borderBottomColor: colors.sandDivider }]}>
            <Text style={sectionTitle}>{t("category")}</Text>
            <View style={styles.categoryGrid}>
              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  {
                    borderColor: !categorySlug ? colors.primary : colors.sandDivider,
                    backgroundColor: !categorySlug ? colors.primary + "15" : colors.surface,
                  },
                ]}
                onPress={() => setCategorySlug(null)}
              >
                <Text style={[styles.categoryCardText, { color: colors.text }]}>
                  {t("all_categories")}
                </Text>
                {!categorySlug && (
                  <FontAwesome name="check" size={18} color={colors.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
              {filters.categories.map((c) => {
                const slug = c.slug ?? String(c.id);
                const isActive = categorySlug === slug;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryCard,
                      {
                        borderColor: isActive ? colors.primary : colors.sandDivider,
                        backgroundColor: isActive ? colors.primary + "15" : colors.surface,
                      },
                    ]}
                    onPress={() => setCategorySlug(isActive ? null : slug)}
                  >
                    <Text style={[styles.categoryCardText, { color: colors.text }]} numberOfLines={2}>
                      {c.name}
                    </Text>
                    {isActive && (
                      <FontAwesome name="check" size={18} color={colors.primary} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Price Range */}
          <View style={[styles.section, { borderBottomColor: colors.sandDivider }]}>
            <Text style={sectionTitle}>{t("price_range")}</Text>
            <View style={styles.priceRow}>
              <View style={[styles.priceInputWrap, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
                <Text style={[styles.priceLabel, { color: colors.textMuted }]}>{t("min_aed")}</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.text }]}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.priceInputWrap, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
                <Text style={[styles.priceLabel, { color: colors.textMuted }]}>{t("max_aed")}</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.text }]}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Brand */}
          <View style={[styles.section, { borderBottomColor: colors.sandDivider }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={sectionTitle}>{t("brand")}</Text>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>{t("see_all")}</Text>
            </View>
            <View style={styles.pillRow}>
              {filters.brands.map((b) => {
                const isActive = brandSlug === b.slug;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.pillWrap, pill(isActive)]}
                    onPress={() => setBrandSlug(isActive ? null : b.slug)}
                  >
                    <Text style={pillText(isActive)}>{b.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Attributes */}
          {filters.attributes.map((attr) => (
            <View key={attr.id} style={[styles.section, { borderBottomColor: colors.sandDivider }]}>
              <Text style={sectionTitle}>{attr.name}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.attrScrollContent}
              >
                {attr.options.map((opt) => {
                  const isActive = selectedOptionIds.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.attrOptionWrap}
                      onPress={() => toggleOption(opt.id)}
                    >
                      <View
                        style={[
                          styles.attrCircle,
                          {
                            borderColor: isActive ? colors.primary : colors.sandDivider,
                            backgroundColor: colors.background,
                          },
                        ]}
                      />
                      <Text style={[styles.attrOptionLabel, { color: colors.text }]} numberOfLines={1}>
                        {opt.value}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.sandDivider, backgroundColor: colors.background }]}>
          <View style={styles.footerLeft}>
            <Text style={[styles.footerLabel, { color: colors.textMuted }]}>{t("results")}</Text>
            <Text style={[styles.footerCount, { fontFamily: FontFamily.serif, color: colors.text }]}>
              {resultCount} {t("items")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.showProductsBtn, { backgroundColor: colors.primary }]}
            onPress={handleApply}
            activeOpacity={0.85}
          >
            <Text style={styles.showProductsText}>{t("show_products")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "600" },
  resetText: { fontSize: 14, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { paddingVertical: 20, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 14 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  seeAllText: { fontSize: 14, fontWeight: "500" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pillWrap: { marginRight: 8, marginBottom: 4 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  categoryCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryCardText: { fontSize: 14, fontWeight: "500", flex: 1 },
  checkIcon: { marginLeft: 8 },
  priceRow: { flexDirection: "row", gap: 16, marginTop: 4 },
  priceInputWrap: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priceLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  priceInput: { fontSize: 14, fontWeight: "600", padding: 0 },
  attrScrollContent: { flexDirection: "row", gap: 20, paddingVertical: 8 },
  attrOptionWrap: { alignItems: "center", width: 72 },
  attrCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    marginBottom: 8,
  },
  attrOptionLabel: { fontSize: 12, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
  },
  footerLeft: {},
  footerLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 2, textTransform: "uppercase" },
  footerCount: { fontSize: 18, fontWeight: "700" },
  showProductsBtn: {
    flex: 1,
    maxWidth: 220,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  showProductsText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
