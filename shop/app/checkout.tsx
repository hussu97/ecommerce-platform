import { useState, useEffect, useRef } from "react";
import { StyleSheet, TouchableOpacity, ScrollView, Alert, View, ActivityIndicator } from "react-native";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import api from "@/lib/api";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface SavedAddress {
  address_code: string;
  contact_name: string;
  phone: string;
  address_type: string;
  street: string;
  city: string;
  country: string;
  is_default: boolean;
}

export default function CheckoutScreen() {
  const { items, getItemCount, clearCart } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressCode, setSelectedAddressCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const hasAddress = addresses.length > 0;

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  function generateIdempotencyKey(): string {
    return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const r = await api.get<SavedAddress[]>("/addresses");
        const list = r.data || [];
        setAddresses(list);
        const defaultAddr = list.find((a) => a.is_default) || list[0];
        if (defaultAddr) setSelectedAddressCode(defaultAddr.address_code);
      } catch {
        setAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    })();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    router.replace("/login?redirect=/checkout");
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressCode) return;
    setLoading(true);
    try {
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = generateIdempotencyKey();
      const key = idempotencyKeyRef.current;
      const { data: order } = await api.post<{ id: number }>(
        "/orders/",
        {
          items: items.map((i) => ({
            product_slug: i.product.slug ?? i.product.id,
            child_code: i.child?.code ?? "",
            quantity: i.quantity,
            price_at_purchase: i.product.price,
          })),
          total_amount: total,
          address_code: selectedAddressCode,
        },
        { headers: { "Idempotency-Key": key } }
      );
      idempotencyKeyRef.current = null;
      await clearCart();
      router.replace(`/order-confirmation?id=${order.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? t("failed_to_create_order");
      Alert.alert(t("checkout"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>
        {t("checkout_title")}
      </Text>
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t("order_summary")}</Text>
        <Text style={[styles.summaryText, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {getItemCount()} {t("items")} • {t("total")}: AED {total.toFixed(2)}
        </Text>
      </View>
      <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
        <Text style={[styles.section, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("delivery_address")}</Text>
        {addressesLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : hasAddress ? (
          <>
            {addresses.map((addr) => (
              <TouchableOpacity
                key={addr.address_code}
                style={[
                  styles.addressCard,
                  { borderColor: colors.sandDivider, backgroundColor: colors.background },
                  selectedAddressCode === addr.address_code && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelectedAddressCode(addr.address_code)}
              >
                <View style={styles.addressRow}>
                  <FontAwesome
                    name={addr.address_type === "office" ? "building" : addr.address_type === "other" ? "map-marker" : "home"}
                    size={18}
                    color={colors.primary}
                  />
                  <View style={styles.addressText}>
                    <Text style={[styles.addressName, { color: colors.text }]}>{addr.contact_name}</Text>
                    <Text style={[styles.addressLine, { color: colors.textMuted }]}>{addr.street}, {addr.city}, {addr.country}</Text>
                    <Text style={[styles.addressPhone, { color: colors.textMuted }]}>{addr.phone}</Text>
                  </View>
                  {selectedAddressCode === addr.address_code && (
                    <FontAwesome name="check-circle" size={20} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => router.push("/addresses?returnTo=/checkout")}>
              <Text style={[styles.addAddressLink, { color: colors.primary }]}>{t("change")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/addresses/new?returnTo=/checkout")}>
              <Text style={[styles.addAddressLink, { color: colors.primary }]}>+ {t("add_new_address")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyAddressBox}>
            <Text style={[styles.hint, { color: colors.textMuted }]}>{t("no_address_yet")}</Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/addresses/new?returnTo=/checkout")}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{t("set_address")}</Text>
            </TouchableOpacity>
          </View>
        )}
        {hasAddress && (
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.primary },
              loading && styles.btnDisabled,
            ]}
            onPress={handlePlaceOrder}
            disabled={loading || !selectedAddressCode}
          >
            <Text style={styles.btnText}>
              {loading ? t("processing") : `${t("place_order")} (AED ${total.toFixed(2)})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  summaryCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  summaryLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  summaryText: { fontSize: 18, fontWeight: "700" },
  form: { padding: 20, borderRadius: 12, borderWidth: 1 },
  section: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  loader: { marginVertical: 16 },
  addressCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  addressText: { flex: 1 },
  addressName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  addressLine: { fontSize: 13, marginBottom: 2 },
  addressPhone: { fontSize: 12 },
  addAddressLink: { fontSize: 14, fontWeight: "600", marginTop: 8, marginBottom: 16 },
  emptyAddressBox: { marginTop: 8 },
  hint: { fontSize: 14, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  btn: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
