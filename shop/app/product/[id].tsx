import { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text, View } from "@/components/Themed";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "@/lib/api";
import { useCartStore, Product } from "@/stores/useCartStore";
import { useI18nStore } from "@/stores/useI18nStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";
import { FullScreenLoader } from "@/components/FullScreenLoader";

const IMAGE_ASPECT = 4 / 5;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH / IMAGE_ASPECT;
const CONTENT_OVERLAP = 32;
const HEADER_HEIGHT = 56;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<{ id: number; rating: number; comment?: string; purchased_at?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const sizesSectionY = useRef<number>(0);
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addToCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getQuantityForProductAndChild = useCartStore((s) => s.getQuantityForProductAndChild);
  const t = useI18nStore((s) => s.t);
  const currentLanguage = useI18nStore((s) => s.currentLanguage);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  type Child = { id: number; code: string; size_value: string; stock_net: number };
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const slug = product?.slug ?? product?.id ?? "";
  const quantity = product && selectedChild ? getQuantityForProductAndChild(slug, selectedChild.code) : 0;
  const children = product?.children ?? [];
  const singleSized = product?.single_sized ?? false;
  const showSizeSelector = !singleSized && children.length > 0 && (children.length > 1 || (children[0] && children[0].size_value !== "single_size"));

  useEffect(() => {
    if (!id) return;
    api
      .get<Product>(`/products/${id}`)
      .then((r) => {
        const p = r.data;
        setProduct(p);
        if (p?.single_sized && p?.children?.length) setSelectedChild(p.children[0]);
        else setSelectedChild(null);
      })
      .catch(() => {
        setProduct(null);
        setError(t("failed_to_load_product"));
      })
      .finally(() => setLoading(false));
  }, [id, currentLanguage?.code]);

  useEffect(() => {
    if (!product?.slug && !product?.id) return;
    const slug = product.slug ?? product.id;
    api.get<{ id: number; rating: number; comment?: string; purchased_at?: string }[]>(`/products/${slug}/reviews`)
      .then((r) => setReviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReviews([]));
  }, [product?.slug, product?.id]);

  const handleAdd = async () => {
    if (!product || !selectedChild) return;
    setIsUpdating(true);
    try {
      await addToCart(product, selectedChild.code);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : t("network_error");
      Alert.alert(t("add_to_cart"), msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIncrease = async () => {
    if (!product || !selectedChild) return;
    setIsUpdating(true);
    try {
      await updateQuantity(slug, selectedChild.code, quantity + 1);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrease = async () => {
    if (!product || !selectedChild || quantity <= 1) return;
    setIsUpdating(true);
    try {
      await updateQuantity(slug, selectedChild.code, quantity - 1);
    } finally {
      setIsUpdating(false);
    }
  };

  const stockNet = selectedChild?.stock_net ?? product?.stock_net ?? product?.stock_quantity ?? 0;

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT],
    outputRange: [0, IMAGE_HEIGHT * 0.35],
    extrapolate: "clamp",
  });

  const contentOpacity = scrollY.interpolate({
    inputRange: [0, CONTENT_OVERLAP + 20],
    outputRange: [0.98, 1],
    extrapolate: "clamp",
  });

  if (loading) {
    return <FullScreenLoader />;
  }

  if (error || !product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.textMuted }]}>{error || t("product_not_found")}</Text>
      </View>
    );
  }

  const scrollToSizes = () => {
    scrollViewRef.current?.scrollTo({ y: sizesSectionY.current, animated: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        ref={scrollViewRef as React.RefObject<ScrollView>}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        {/* Image at top - full width, parallax on scroll */}
        <Animated.View style={[styles.imageContainer, { height: IMAGE_HEIGHT }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
            activeOpacity={0.9}
          >
            <FontAwesome name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Animated.View style={[styles.imageWrap, { transform: [{ translateY: imageTranslateY }] }]}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.sandDivider + "40" }]}>
                <FontAwesome name="image" size={64} color={colors.textMuted} />
                <Text style={[styles.noImageText, { color: colors.textMuted }]}>{t("no_image")}</Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Content panel - slides over image */}
        <Animated.View
          style={[
            styles.contentPanel,
            {
              backgroundColor: colors.background,
              marginTop: -CONTENT_OVERLAP,
              borderColor: colors.sandDivider,
            },
            { opacity: contentOpacity },
          ]}
        >
          <View style={styles.contentInner}>
            <View style={styles.titleRow}>
              <Text style={[styles.categoryLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {[product.category_path, product.brand_name].filter(Boolean).join(" • ") || t("product")}
              </Text>
              {(product.avg_rating != null || (product.rating_count ?? 0) > 0) && (
                <View style={styles.ratingBadge}>
                  <FontAwesome name="star" size={12} color={colors.primary} />
                  <Text style={[styles.ratingBadgeText, { color: colors.primary }]}>
                    {product.avg_rating?.toFixed(1) ?? "-"} ({(product.rating_count ?? 0)} {t("reviews")})
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.productName, { fontFamily: FontFamily.serif, color: colors.text }]}>
              {product.name}
            </Text>
            <Text style={[styles.price, { color: colors.primary }]}>AED {product.price.toFixed(2)}</Text>

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
                {t("description")}
              </Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {product.description || t("no_description")}
              </Text>
            </View>

            {/* Specifications (attributes) */}
            {product.attributes && product.attributes.length > 0 && (
              <View style={[styles.specsCard, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
                <Text
                  style={[
                    styles.specsTitle,
                    {
                      fontFamily: FontFamily.serif,
                      color: colors.text,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.sandDivider,
                    },
                  ]}
                >
                  {t("specifications")}
                </Text>
                <View style={styles.specsGrid}>
                  {product.attributes.map((a) => (
                    <View key={a.attribute_name} style={styles.specRow}>
                      <Text style={[styles.specLabel, { color: colors.textMuted }]}>{a.attribute_name}</Text>
                      <Text style={[styles.specValue, { color: colors.text }]}>{a.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Size selector */}
            {showSizeSelector && children.length > 0 && (
              <View
                style={styles.section}
                onLayout={(e) => {
                  sizesSectionY.current = (IMAGE_HEIGHT - CONTENT_OVERLAP) + e.nativeEvent.layout.y;
                }}
              >
                <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
                  {t("size")}
                </Text>
                <View style={styles.sizeRow}>
                  {children.map((ch) => (
                    <TouchableOpacity
                      key={ch.id}
                      onPress={() => setSelectedChild(ch)}
                      disabled={ch.stock_net <= 0}
                      style={[
                        styles.sizePill,
                        {
                          borderColor: colors.sandDivider,
                          backgroundColor: selectedChild?.id === ch.id ? colors.primary + "20" : colors.background,
                          borderWidth: selectedChild?.id === ch.id ? 2 : 1,
                          opacity: ch.stock_net <= 0 ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.sizePillText, { color: colors.text }]}>{ch.size_value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Delivery */}
            <View style={[styles.deliveryRow, { borderColor: colors.sandDivider }]}>
              <View style={[styles.deliveryIconWrap, { backgroundColor: colors.sandDivider + "50" }]}>
                <FontAwesome name="truck" size={20} color={colors.primary} />
              </View>
              <View style={styles.deliveryText}>
                <Text style={[styles.deliveryTitle, { color: colors.text }]}>
                  {stockNet > 0 ? t("complimentary_delivery") : t("out_of_stock")}
                </Text>
                <Text style={[styles.deliverySub, { color: colors.textMuted }]}>
                  {stockNet > 0 ? t("delivery_expected_uae") : ""}
                </Text>
              </View>
            </View>

            {/* Reviews */}
            {reviews.length > 0 && (
              <View style={[styles.reviewsSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.reviewsTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
                  {t("reviews_heading")}
                </Text>
                {reviews.map((rev) => (
                  <View key={rev.id} style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FontAwesome key={s} name={s <= rev.rating ? "star" : "star-o"} size={14} color={colors.primary} />
                        ))}
                      </View>
                      {rev.purchased_at && (
                        <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                          {new Date(rev.purchased_at).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    {rev.comment ? (
                      <Text style={[styles.reviewComment, { color: colors.text }]}>{rev.comment}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Fixed bottom: qty + Add to Cart or Select size */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
        {singleSized || selectedChild ? (
          <View style={[styles.qtyPill, { borderColor: colors.sandDivider, backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={handleDecrease}
              disabled={isUpdating || quantity <= 1 || stockNet <= 0}
            >
              <FontAwesome name="minus" size={18} color={colors.text} />
            </TouchableOpacity>
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.qtyLoader} />
            ) : (
              <Text style={[styles.qtyNum, { color: colors.text }]}>{quantity}</Text>
            )}
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={handleIncrease}
              disabled={isUpdating || quantity >= stockNet || stockNet <= 0}
            >
              <FontAwesome name="plus" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : null}
        {singleSized || selectedChild ? (
          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: colors.primary },
              (isUpdating || stockNet <= 0 || !selectedChild) && styles.addBtnDisabled,
            ]}
            onPress={handleAdd}
            disabled={isUpdating || stockNet <= 0 || !selectedChild}
            activeOpacity={0.85}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addBtnText}>{t("add_to_cart")}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={scrollToSizes}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>{t("select_size")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: {},
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  imageContainer: { width: SCREEN_WIDTH, overflow: "hidden" },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 16,
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.95,
  },
  imageWrap: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT + 80 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  noImageText: { fontSize: 12, marginTop: 8 },
  contentPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#181511",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  contentInner: { paddingHorizontal: 20, paddingBottom: 24 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 1, flex: 1 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingBadgeText: { fontSize: 12, fontWeight: "700" },
  productName: { fontSize: 26, fontWeight: "700", marginBottom: 8 },
  price: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 22 },
  specsCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  specsTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16, paddingBottom: 12 },
  specsGrid: { flexDirection: "row", flexWrap: "wrap" },
  specRow: { width: "50%", marginBottom: 14 },
  specLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  specValue: { fontSize: 14, fontWeight: "500" },
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  sizePill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  sizePillText: { fontSize: 14, fontWeight: "600" },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  deliveryIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  deliveryText: { flex: 1 },
  deliveryTitle: { fontSize: 13, fontWeight: "700" },
  deliverySub: { fontSize: 11, marginTop: 2 },
  reviewsSection: { marginTop: 8 },
  reviewsTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  reviewCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewDate: { fontSize: 12 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
  },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 9999,
    overflow: "hidden",
    minWidth: 120,
  },
  qtyBtn: { padding: 12 },
  qtyNum: { fontSize: 16, fontWeight: "600", minWidth: 32, textAlign: "center" },
  qtyLoader: { paddingHorizontal: 12 },
  addBtn: { flex: 1, paddingVertical: 16, borderRadius: 9999, alignItems: "center", justifyContent: "center" },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
