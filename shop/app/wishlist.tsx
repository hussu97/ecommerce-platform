import { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWishlistStore } from "@/stores/useWishlistStore";
import { useI18nStore } from "@/stores/useI18nStore";
import type { Product } from "@/stores/useCartStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";
import { FullScreenLoader } from "@/components/FullScreenLoader";

const CARD_WIDTH = Platform.OS === "web" ? 180 : (Dimensions.get("window").width - 16 * 3) / 2;

export default function WishlistScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, isLoading, fetchWishlist, removeFromWishlist, moveToCart } = useWishlistStore();
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [movingSlug, setMovingSlug] = useState<string | null>(null);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [selectedChildBySlug, setSelectedChildBySlug] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated) fetchWishlist();
  }, [isAuthenticated, fetchWishlist]);

  if (!isAuthenticated) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centered}
      >
        <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("my_wishlist")}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{t("sign_in_to_save")}</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{t("sign_in")}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (isLoading && items.length === 0) {
    return <FullScreenLoader />;
  }

  if (items.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centered}
      >
        <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("wishlist_empty")}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{t("wishlist_empty_hint")}</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{t("shop_now")}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const handleRemove = async (slug: string) => {
    setRemovingSlug(slug);
    try {
      await removeFromWishlist(slug);
    } finally {
      setRemovingSlug(null);
    }
  };

  const handleMoveToBag = async (product: Product) => {
    const slug = product.slug ?? product.id;
    const isSingle = product.single_sized ?? (product.children?.length === 1);
    const childCode = isSingle ? product.children?.[0]?.code : selectedChildBySlug[slug];
    if (!childCode) return;
    setMovingSlug(slug);
    try {
      await moveToCart(slug, childCode);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : t("network_error");
      Alert.alert(t("move_to_bag"), msg);
    } finally {
      setMovingSlug(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.gridContent}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={fetchWishlist} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <View style={styles.grid}>
        {items.map((product) => {
          const slug = product.slug ?? product.id;
          const isSingle = product.single_sized ?? (product.children?.length === 1);
          const singleChild = isSingle ? product.children?.[0] : null;
          const children = product.children ?? [];
          const selectedCode = selectedChildBySlug[slug] ?? singleChild?.code;
          const selectedChild = children.find((c) => c.code === selectedCode);
          const canMoveToBag = isSingle ? singleChild && singleChild.stock_net > 0 : selectedChild && selectedChild.stock_net > 0;

          return (
            <View key={slug} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
              <TouchableOpacity
                onPress={() => router.push(`/product/${slug}`)}
                activeOpacity={0.9}
                style={styles.imageWrap}
              >
                <View style={[styles.imageContainer, { backgroundColor: colors.sandDivider + "40" }]}>
                  {product.image_url ? (
                    <Image source={{ uri: product.image_url }} style={styles.image} contentFit="cover" />
                  ) : (
                    <Text style={[styles.noImage, { color: colors.textMuted }]}>{t("no_image")}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.heartBtn, { backgroundColor: "rgba(255,255,255,0.9)" }]}
                  onPress={() => handleRemove(slug)}
                  disabled={removingSlug === slug}
                >
                  <FontAwesome name="heart" size={18} color={colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
              <View style={styles.cardBody}>
                <Text style={[styles.brand, { color: colors.textMuted }]} numberOfLines={1}>
                  {product.brand_name || t("product")}
                </Text>
                <TouchableOpacity onPress={() => router.push(`/product/${slug}`)}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.price, { color: colors.primary }]}>
                  AED {product.price.toFixed(2)}
                </Text>
                {!isSingle && children.length > 1 && (
                  <View style={styles.sizeRow}>
                    <Text style={[styles.sizeLabel, { color: colors.textMuted }]}>{t("size")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizeScroll}>
                      {children.map((ch) => (
                        <TouchableOpacity
                          key={ch.code}
                          onPress={() =>
                            setSelectedChildBySlug((prev) => ({ ...prev, [slug]: ch.code }))
                          }
                          style={[
                            styles.sizeChip,
                            { borderColor: colors.sandDivider },
                            selectedCode === ch.code && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ch.stock_net <= 0 && styles.sizeChipDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sizeChipText,
                              { color: selectedCode === ch.code ? "#fff" : colors.text },
                              ch.stock_net <= 0 && { color: colors.textMuted },
                            ]}
                          >
                            {ch.size_value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.moveBtn,
                    { backgroundColor: colors.primary },
                    (!canMoveToBag || movingSlug === slug) && styles.moveBtnDisabled,
                  ]}
                  onPress={() => handleMoveToBag(product)}
                  disabled={!canMoveToBag || movingSlug === slug}
                  activeOpacity={0.85}
                >
                  {movingSlug === slug ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.moveBtnText}>{t("move_to_bag")}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  hint: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  primaryBtn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 9999 },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  gridContent: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageWrap: { position: "relative" },
  imageContainer: { aspectRatio: 4 / 5, width: "100%" },
  image: { width: "100%", height: "100%" },
  noImage: { position: "absolute", alignSelf: "center", top: "40%", fontSize: 12 },
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
  cardBody: { padding: 10 },
  brand: { fontSize: 10, textTransform: "uppercase", marginBottom: 2 },
  name: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  price: { fontSize: 13, fontWeight: "700" },
  sizeRow: { marginTop: 8 },
  sizeLabel: { fontSize: 10, marginBottom: 4 },
  sizeScroll: { flexGrow: 0 },
  sizeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 1,
    marginRight: 6,
  },
  sizeChipDisabled: { opacity: 0.6 },
  sizeChipText: { fontSize: 12, fontWeight: "600" },
  moveBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  moveBtnDisabled: { opacity: 0.5 },
  moveBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
