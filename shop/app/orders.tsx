import { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/lib/api";
import { useI18nStore } from "@/stores/useI18nStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";
import { FullScreenLoader } from "@/components/FullScreenLoader";

interface Order {
  id: number;
  order_number?: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address?: string;
  items?: { id: number; order_item_number: number; status: string }[];
}

export default function OrdersScreen() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const r = await api.get<Order[]>("/orders/my-orders");
        setOrders(r.data);
      } catch {
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (isLoading) {
    return <FullScreenLoader />;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("returns_and_orders")}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t("view_and_track_orders")}</Text>

      {orders.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
          <FontAwesome name="shopping-bag" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("no_orders_yet")}</Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/")}
          >
            <Text style={styles.shopBtnText}>{t("start_shopping")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        orders.map((order) => (
          <View key={order.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.orderNumber, { fontFamily: FontFamily.serif, color: colors.text }]}>
                {t("order_number")} {order.order_number || order.id}
              </Text>
              <Text style={[styles.value, { fontFamily: FontFamily.serif, color: colors.primary }]}>
                AED {order.total_amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {new Date(order.created_at).toLocaleDateString()}
              </Text>
              <Text
                style={[
                  styles.status,
                  (styles as Record<string, object>)[`status_${order.status}`] || styles.status_pending,
                ]}
              >
                {order.status}
              </Text>
            </View>
            {order.shipping_address ? (
              <Text style={[styles.shipTo, { color: colors.textMuted }]}>{order.shipping_address}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.detailBtn, { borderColor: colors.primary }]}
              onPress={() => router.push(`/order/${order.id}`)}
            >
              <Text style={[styles.detailBtnText, { color: colors.primary }]}>{t("view_details")}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 24 },
  loader: { marginTop: 24 },
  empty: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: { marginTop: 16, marginBottom: 24 },
  shopBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  shopBtnText: { color: "#fff", fontWeight: "600" },
  card: { padding: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderNumber: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: "600" },
  status: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  status_paid: { backgroundColor: "#d1fae5", color: "#065f46" },
  status_shipped: { backgroundColor: "#dbeafe", color: "#1e40af" },
  shipTo: { fontSize: 12, marginTop: 4, marginBottom: 12 },
  detailBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  detailBtnText: { fontSize: 14 },
});
