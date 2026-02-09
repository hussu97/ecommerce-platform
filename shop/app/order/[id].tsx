import { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  View,
  Image,
  Platform,
  Linking,
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

interface OrderItemReview {
  rating: number;
  comment?: string | null;
}

interface OrderItem {
  id: number;
  order_item_number: number;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  status: string;
  product?: OrderItemProduct;
  can_rate?: boolean;
  has_review?: boolean;
  review?: OrderItemReview | null;
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

type TimelineStep = "delivered" | "out_for_delivery" | "shipped" | "processed";

const TIMELINE_STEPS: { key: TimelineStep; icon: string; labelKey: string }[] = [
  { key: "delivered", icon: "checkmark", labelKey: "delivered" },
  { key: "out_for_delivery", icon: "car", labelKey: "out_for_delivery" },
  { key: "shipped", icon: "cube-outline", labelKey: "shipped_from_hub" },
  { key: "processed", icon: "archive-outline", labelKey: "order_processed" },
];

function stepReached(status: string, step: TimelineStep): boolean {
  const s = (status || "").toLowerCase();
  if (step === "processed") return true;
  if (step === "shipped") return ["shipped", "in_transit", "out_for_delivery", "delivered"].some((x) => s.includes(x));
  if (step === "out_for_delivery") return ["out_for_delivery", "in_transit", "delivered"].some((x) => s.includes(x));
  if (step === "delivered") return s.includes("delivered");
  return false;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [rateItem, setRateItem] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const fetchOrder = async () => {
    if (!id) return;
    try {
      const r = await api.get<Order>(`/orders/${id}`);
      setOrder(r.data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    fetchOrder();
  }, [isAuthenticated, id, router]);

  const openRateModal = (item: OrderItem) => {
    setRateItem(item);
    setRating(item.review?.rating ?? 5);
    setComment(item.review?.comment ?? "");
    setRateModalVisible(true);
  };

  const submitReview = async () => {
    if (!rateItem) return;
    setSubmitting(true);
    try {
      const payload = { rating, comment: comment || undefined };
      if (rateItem.has_review) {
        await api.put(`/orders/items/${rateItem.id}/review`, payload);
      } else {
        await api.post(`/orders/items/${rateItem.id}/review`, payload);
      }
      setRateModalVisible(false);
      setRateItem(null);
      await fetchOrder();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e && (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          ? String((e as { response: { data: { detail: string } } }).response.data.detail)
          : t("failed_to_submit_review");
      Alert.alert("Review", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

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
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>{t("back_to_home")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const placedDate = new Date(order.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const subtotal = order.items?.reduce((s, i) => s + i.price_at_purchase * i.quantity, 0) ?? order.total_amount;
  const shipping = Math.max(0, order.total_amount - subtotal - subtotal * 0.05);
  const tax = subtotal * 0.05;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.sandDivider }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
            {t("order_number")} {order.order_number || order.id}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {t("placed")} {placedDate}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => Linking.openURL("mailto:support@7alaa.com")} hitSlop={12}>
          <Ionicons name="help-circle-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("delivery_status")}
        </Text>
        <View style={styles.timeline}>
          <View style={[styles.timelineLine, { backgroundColor: colors.sandDivider }]} />
          {TIMELINE_STEPS.map((step, index) => {
            const reached = stepReached(order.status, step.key);
            return (
              <View key={step.key} style={styles.timelineStep}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: reached ? colors.primary : colors.sandDivider },
                    reached && styles.timelineDotRing,
                    reached && { borderColor: colors.background },
                  ]}
                >
                  <Ionicons
                    name={step.icon as keyof typeof Ionicons.glyphMap}
                    size={12}
                    color={reached ? "#fff" : colors.textMuted}
                  />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, { color: colors.text }]}>{t(step.labelKey)}</Text>
                  <Text style={[styles.timelineDate, { color: colors.textMuted }]}>
                    {placedDate}
                    {index === 0 && order.status?.toLowerCase() === "delivered" ? " • —" : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.itemsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
            {t("order_items")}
          </Text>
          <View style={styles.itemsGrid}>
            {(order.items || []).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => item.product?.slug && router.push(`/product/${item.product.slug}`)}
                activeOpacity={0.9}
              >
                <View style={[styles.itemImageWrap, { backgroundColor: colors.background }]}>
                  {item.product?.image_url ? (
                    <Image source={{ uri: item.product.image_url }} style={styles.itemImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <FontAwesome name="image" size={28} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={[styles.qtyBadge, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
                    <Text style={styles.qtyBadgeText}>QTY: {item.quantity}</Text>
                  </View>
                </View>
                <Text style={[styles.itemName, { fontFamily: FontFamily.serif, color: colors.text }]} numberOfLines={2}>
                  {item.product?.name ?? `Product ${item.product_id}`}
                </Text>
                <Text style={[styles.itemCategory, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.product?.category_path ?? item.product?.brand_name ?? "—"}
                </Text>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  AED {item.price_at_purchase.toFixed(2)}
                </Text>
                {item.can_rate && (
                  <TouchableOpacity
                    style={[styles.rateBtnSmall, { backgroundColor: colors.primary }]}
                    onPress={() => openRateModal(item)}
                  >
                    <FontAwesome name={item.has_review ? "edit" : "star"} size={12} color="#fff" />
                    <Text style={styles.rateBtnSmallText}>
                      {item.has_review ? t("edit_review") : t("rate")}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("summary")}
        </Text>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t("subtotal")}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>AED {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t("shipping_label")}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {shipping > 0 ? `AED ${shipping.toFixed(2)}` : t("complimentary")}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t("tax_vat")}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>AED {tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={[styles.summaryTotalLabel, { fontFamily: FontFamily.serif, color: colors.text }]}>
              {t("total")}
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>
              AED {order.total_amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {order.shipping_address ? (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
              {t("shipping_details")}
            </Text>
            <View style={[styles.shippingCard, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
              <Ionicons name="location-outline" size={20} color={colors.textMuted} style={styles.shippingIcon} />
              <Text style={[styles.shippingText, { color: colors.text }]}>{order.shipping_address}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.sandDivider, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
          onPress={() => {}}
          activeOpacity={0.9}
        >
          <Text style={styles.downloadBtnText}>{t("download_invoice")}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={rateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRateModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRateModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
              {rateItem?.has_review ? t("edit_review") : t("rate_product")}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)} style={styles.starBtn}>
                  <FontAwesome name={s <= rating ? "star" : "star-o"} size={32} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.commentInput, { borderColor: colors.sandDivider, color: colors.text }]}
              placeholder={t("optional_comment")}
              placeholderTextColor={colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRateModalVisible(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: colors.primary }, submitting && styles.modalSubmitDisabled]}
                onPress={submitReview}
                disabled={submitting}
              >
                <Text style={styles.modalSubmitText}>{submitting ? "..." : t("submit")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { marginBottom: 16 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1 },
  backBtnText: { fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSubtitle: { fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  timeline: { marginBottom: 24, position: "relative" },
  timelineLine: {
    position: "absolute",
    left: 11,
    top: 12,
    bottom: 12,
    width: 2,
  },
  timelineStep: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timelineDotRing: { borderWidth: 4 },
  timelineContent: { marginLeft: 16, flex: 1 },
  timelineLabel: { fontSize: 14, fontWeight: "700" },
  timelineDate: { fontSize: 12, marginTop: 2 },
  itemsSection: { marginHorizontal: -24, paddingHorizontal: 24, paddingVertical: 20, marginBottom: 24 },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  itemCard: { width: "47%", maxWidth: 180 },
  itemImageWrap: {
    aspectRatio: 4 / 5,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  itemImage: { width: "100%", height: "100%" },
  itemImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  qtyBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyBadgeText: { fontSize: 10, fontWeight: "700", color: "#181511" },
  itemName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  itemCategory: { fontSize: 12, marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: "600" },
  rateBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  rateBtnSmallText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  summaryCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryRowTotal: { marginTop: 8, marginBottom: 0, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e5e1da" },
  summaryTotalLabel: { fontSize: 18, fontWeight: "700" },
  summaryTotalValue: { fontSize: 18, fontWeight: "700" },
  shippingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  shippingIcon: { marginRight: 12, marginTop: 2 },
  shippingText: { flex: 1, fontSize: 14, lineHeight: 22 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderTopWidth: 1,
  },
  downloadBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  downloadBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: { width: "100%", maxWidth: 360, padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  starBtn: { padding: 4 },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 20 },
  modalCancelText: { fontSize: 16 },
  modalSubmit: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
  modalSubmitDisabled: { opacity: 0.6 },
  modalSubmitText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
