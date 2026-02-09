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
}

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
        <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("your_profile")}</Text>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {t("hello")}, {user?.full_name || "User"}
        </Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.sandDivider }]}
          onPress={() => {
            logout();
            router.replace("/");
          }}
          activeOpacity={0.85}
        >
          <FontAwesome name="sign-out" size={16} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.primary }]}>{t("sign_out")}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("order_history")}</Text>
      {orders.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("no_orders_yet")}</Text>
        </View>
      ) : (
        orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            onPress={() => router.push(`/order/${order.id}`)}
            activeOpacity={0.85}
          >
            <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
              <View style={styles.cardRow}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
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
                <Text style={[styles.status, styles[`status_${order.status}` as keyof typeof styles] || styles.status_pending]}>
                  {order.status}
                </Text>
              </View>
              {order.shipping_address ? (
                <Text style={[styles.shipTo, { color: colors.textMuted }]}>{order.shipping_address}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  card: { padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  greeting: { fontSize: 16, marginBottom: 4 },
  email: { fontSize: 14, marginBottom: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  logoutText: { fontWeight: "600", fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  loader: { marginTop: 24 },
  empty: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  emptyText: { fontSize: 15 },
  orderCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: "600" },
  status: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  status_paid: { backgroundColor: "#d1fae5", color: "#065f46" },
  status_shipped: { backgroundColor: "#dbeafe", color: "#1e40af" },
  status_pending: { backgroundColor: "#f3f4f6", color: "#6b7280" },
  shipTo: { fontSize: 12, marginTop: 4 },
});
