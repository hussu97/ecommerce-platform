import { useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  View,
  RefreshControl,
} from "react-native";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import { useCartStore } from "@/stores/useCartStore";
import { useI18nStore } from "@/stores/useI18nStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";
import { FullScreenLoader } from "@/components/FullScreenLoader";

export default function CartScreen() {
  const { items, isLoading, fetchCart, removeFromCart, updateQuantity } = useCartStore();
  const router = useRouter();
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    fetchCart();
  }, []);

  if (isLoading && items.length === 0) {
    return <FullScreenLoader />;
  }

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <FontAwesome name="shopping-cart" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("your_cart_is_empty")}</Text>
        <TouchableOpacity
          style={[styles.shopBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/")}
          activeOpacity={0.85}
        >
          <Text style={styles.shopBtnText}>{t("continue_shopping")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchCart} tintColor={colors.primary} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
            <View style={styles.imageWrap}>
              {item.product.image_url ? (
                <Image source={{ uri: item.product.image_url }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.background }]}>
                  <FontAwesome name="image" size={24} color={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.details}>
              <Text style={[styles.name, { fontFamily: FontFamily.serif, color: colors.text }]} numberOfLines={2}>
                {item.product.name}
              </Text>
              {item.child?.size_value && item.child.size_value !== "single_size" ? (
                <Text style={[styles.priceLine, { color: colors.textMuted }]}>
                  {t("size")}: {item.child.size_value}
                </Text>
              ) : null}
              <Text style={[styles.priceLine, { color: colors.textMuted }]}>
                AED {item.product.price.toFixed(2)} × {item.quantity}
              </Text>
              <View style={[styles.qtyPill, { borderColor: colors.sandDivider, backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    updateQuantity(item.product.slug ?? item.product_id, item.child?.code ?? "", item.quantity - 1)
                  }
                >
                  <FontAwesome name="minus" size={14} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.qtyNum, { color: colors.text }]}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() =>
                    updateQuantity(item.product.slug ?? item.product_id, item.child?.code ?? "", item.quantity + 1)
                  }
                >
                  <FontAwesome name="plus" size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(t("remove"), t("remove") + "?", [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("remove"),
                      onPress: () =>
                        removeFromCart(item.product.slug ?? item.product_id, item.child?.code ?? ""),
                      style: "destructive",
                    },
                  ])
                }
                style={styles.removeWrap}
              >
                <Text style={[styles.remove, { color: colors.textMuted }]}>{t("remove")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.sandDivider }]}>
        <Text style={[styles.total, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("total")}: AED {total.toFixed(2)}
        </Text>
        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/checkout")}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>{t("proceed_to_checkout")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const THUMB_SIDE = 88;
const THUMB_ASPECT = 4 / 5;

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: { fontSize: 18, marginTop: 16, textAlign: "center" },
  shopBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
  },
  shopBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  card: {
    flexDirection: "row",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  imageWrap: { marginRight: 14 },
  thumb: {
    width: THUMB_SIDE,
    height: THUMB_SIDE / THUMB_ASPECT,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  details: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "700" },
  priceLine: { fontSize: 13, marginTop: 4 },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 9999,
    marginTop: 10,
    overflow: "hidden",
  },
  qtyBtn: { padding: 10 },
  qtyNum: { fontSize: 14, fontWeight: "600", minWidth: 28, textAlign: "center" },
  removeWrap: { marginTop: 10 },
  remove: { fontSize: 14 },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1 },
  total: { fontSize: 20, fontWeight: "700", marginBottom: 14 },
  checkoutBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
