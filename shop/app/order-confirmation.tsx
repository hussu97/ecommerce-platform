import { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
} from "react-native";
import { Text } from "@/components/Themed";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/lib/api";
import { useI18nStore } from "@/stores/useI18nStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";

interface OrderItemProduct {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
  brand_name?: string | null;
  category_path?: string | null;
}

interface OrderItem {
  id: number;
  order_item_number: number;
  quantity: number;
  price_at_purchase: number;
  product?: OrderItemProduct;
}

interface Order {
  id: number;
  order_number?: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address?: string;
  items: OrderItem[];
}

function expectedDeliveryText(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const d2 = new Date();
  d2.setDate(d2.getDate() + 5);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${d2.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default function OrderConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!id) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const r = await api.get<Order>(`/orders/${id}`);
        setOrder(r.data);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, id, router]);

  if (!isAuthenticated || !id) return null;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.textMuted }]}>{t("product_not_found")}</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace("/")}>
          <Text style={styles.backBtnText}>{t("back_to_home")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const firstItem = order.items?.[0];
  const subtotal = order.items?.reduce((s, i) => s + i.price_at_purchase * i.quantity, 0) ?? order.total_amount;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.sandDivider }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.replace("/")} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: FontFamily.serif, color: colors.textMuted }]}>
          {t("order_status")}
        </Text>
        <TouchableOpacity style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
            {t("thank_you_order")}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            {t("thank_you_desert_message")}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
          <View style={[styles.cardRow, styles.cardRowBorder, { borderBottomColor: colors.sandDivider }]}>
            <View>
              <Text style={[styles.uppercaseLabel, { color: colors.textMuted }]}>{t("order_number")}</Text>
              <Text style={[styles.orderNumValue, { color: colors.text }]}>
                #{order.order_number || `ORD-${order.id}`}
              </Text>
            </View>
            <View style={styles.alignEnd}>
              <Text style={[styles.uppercaseLabel, { color: colors.textMuted }]}>{t("expected_delivery")}</Text>
              <Text style={[styles.expectedDate, { fontFamily: FontFamily.serif, color: colors.primary }]}>
                {expectedDeliveryText()}
              </Text>
            </View>
          </View>

          {firstItem && (
            <View style={styles.firstItemRow}>
              <View style={[styles.firstItemImageWrap, { backgroundColor: colors.background }]}>
                {firstItem.product?.image_url ? (
                  <Image source={{ uri: firstItem.product.image_url }} style={styles.firstItemImage} resizeMode="cover" />
                ) : (
                  <View style={styles.firstItemImagePlaceholder}>
                    <FontAwesome name="image" size={24} color={colors.textMuted} />
                  </View>
                )}
              </View>
              <View style={styles.firstItemInfo}>
                <Text style={[styles.firstItemName, { fontFamily: FontFamily.serif, color: colors.text }]} numberOfLines={2}>
                  {firstItem.product?.name ?? `Item #${firstItem.order_item_number}`}
                </Text>
                <Text style={[styles.firstItemMeta, { color: colors.textMuted }]}>
                  Qty: {firstItem.quantity}
                </Text>
                <Text style={[styles.firstItemPrice, { color: colors.primary }]}>
                  AED {firstItem.price_at_purchase.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.totals, { borderTopColor: colors.sandDivider }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>{t("subtotal")}</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>AED {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>{t("shipping_label")}</Text>
              <Text style={[styles.complimentary, { color: "#059669" }]}>{t("complimentary")}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={[styles.totalFinalLabel, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("total")}</Text>
              <Text style={[styles.totalFinalValue, { fontFamily: FontFamily.serif, color: colors.text }]}>
                AED {order.total_amount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {order.shipping_address ? (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
              {t("delivery_address_heading")}
            </Text>
            <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
              <View style={[styles.addressIconWrap, { backgroundColor: colors.background }]}>
                <Ionicons name="location" size={20} color={colors.textMuted} />
              </View>
              <Text style={[styles.addressText, { color: colors.text }]}>{order.shipping_address}</Text>
            </View>
          </>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}
            onPress={() => router.push(`/order/${order.id}`)}
          >
            <Ionicons name="cube-outline" size={24} color={colors.primary} style={styles.actionBtnIcon} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>{t("track_order")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}
            onPress={() => Linking.openURL("mailto:support@7alaa.com")}
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.primary} style={styles.actionBtnIcon} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>{t("get_help")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.backToHomeBtn, { backgroundColor: colors.text }]}
          onPress={() => router.replace("/")}
          activeOpacity={0.9}
        >
          <Text style={styles.backToHomeBtnText}>{t("back_to_home")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { marginBottom: 16 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: "#fff", fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 48 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 12, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
  hero: { alignItems: "center", paddingVertical: 32 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 24,
  },
  heroTitle: { fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 12, paddingHorizontal: 16 },
  heroSubtitle: { fontSize: 14, textAlign: "center", maxWidth: 280, lineHeight: 22 },
  card: { padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardRowBorder: { paddingBottom: 16, marginBottom: 16 },
  uppercaseLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  orderNumValue: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  alignEnd: { alignItems: "flex-end" },
  expectedDate: { fontSize: 14, fontWeight: "700" },
  firstItemRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  firstItemImageWrap: { width: 80, height: 96, borderRadius: 12, overflow: "hidden" },
  firstItemImage: { width: "100%", height: "100%" },
  firstItemImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  firstItemInfo: { flex: 1, justifyContent: "center" },
  firstItemName: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  firstItemMeta: { fontSize: 11, marginBottom: 4 },
  firstItemPrice: { fontSize: 14, fontWeight: "600" },
  totals: { paddingTop: 16, borderTopWidth: 1 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 12 },
  complimentary: { fontSize: 12, fontWeight: "600" },
  totalRowFinal: { marginTop: 8, marginBottom: 0, paddingTop: 8 },
  totalFinalLabel: { fontSize: 16, fontWeight: "700" },
  totalFinalValue: { fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addressText: { flex: 1, fontSize: 14, lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionBtnIcon: { marginBottom: 8 },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  backToHomeBtn: {
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: "center",
  },
  backToHomeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
