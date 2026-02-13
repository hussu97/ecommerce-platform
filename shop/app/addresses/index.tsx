import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { Text } from "@/components/Themed";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";
import { FullScreenLoader } from "@/components/FullScreenLoader";

export interface SavedAddress {
  address_code: string;
  contact_name: string;
  phone: string;
  address_type: string;
  street: string;
  city: string;
  country: string;
  postal_code?: string | null;
  state_province?: string | null;
  label?: string | null;
  company_name?: string | null;
  building_name?: string | null;
  floor_office?: string | null;
  is_default: boolean;
}

function addressTitle(addr: SavedAddress, t: (k: string) => string): string {
  if (addr.address_type === "home") return `${t("address_type_home")}${addr.building_name ? ` - ${addr.building_name}` : ""}`;
  if (addr.address_type === "office") return addr.company_name || t("address_type_office");
  return addr.label || t("address_type_other");
}

export default function AddressesScreen() {
  const { isAuthenticated } = useAuthStore();
  const t = useI18nStore((s) => s.t);
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnToCheckout = returnTo === "/checkout";
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?redirect=/addresses");
      return;
    }
    (async () => {
      try {
        const r = await api.get<SavedAddress[]>("/addresses");
        setAddresses(r.data || []);
      } catch {
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, router]);

  const setDefault = async (addressCode: string) => {
    try {
      await api.patch(`/addresses/${addressCode}/default`);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.address_code === addressCode }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.sandDivider }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("shipping_addresses")}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {returnToCheckout && (
            <TouchableOpacity onPress={() => router.push("/checkout")} style={styles.backToCheckout}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
              <Text style={[styles.backToCheckoutText, { color: colors.primary }]}>{t("back_to_checkout")}</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t("saved_locations")}</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{t("saved_locations_hint")}</Text>
          {addresses.map((addr) => (
            <View
              key={addr.address_code}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: addr.is_default ? colors.primary : colors.sandDivider },
                addr.is_default && styles.cardDefault,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.iconWrap, { backgroundColor: addr.is_default ? `${colors.primary}20` : colors.background }]}>
                    <FontAwesome
                      name={addr.address_type === "office" ? "building" : addr.address_type === "other" ? "map-marker" : "home"}
                      size={20}
                      color={addr.is_default ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{addressTitle(addr, t)}</Text>
                    {addr.is_default && (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.defaultBadgeText}>{t("default")}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push(`/addresses/${addr.address_code}/edit`)}>
                  <FontAwesome name="pencil" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.cardLine, { color: colors.text }]}>{addr.street}</Text>
              <Text style={[styles.cardLine, { color: colors.text }]}>
                {addr.city}
                {addr.state_province ? `, ${addr.state_province}` : ""} {addr.country}
              </Text>
              <Text style={[styles.cardPhone, { color: colors.textMuted }]}>{addr.phone}</Text>
              {!addr.is_default && (
                <TouchableOpacity onPress={() => setDefault(addr.address_code)}>
                  <Text style={[styles.setDefaultText, { color: colors.primary }]}>{t("set_as_default")}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.sandDivider }]}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push(returnToCheckout ? "/addresses/new?returnTo=/checkout" : "/addresses/new")}
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={styles.addBtnText}>{t("add_new_address")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", textAlign: "center" },
  loader: { flex: 1, marginTop: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  backToCheckout: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backToCheckoutText: { fontSize: 14, fontWeight: "600" },
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  sectionHint: { fontSize: 12, marginBottom: 16 },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardDefault: { borderWidth: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 },
  defaultBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  cardLine: { fontSize: 14, marginBottom: 4 },
  cardPhone: { fontSize: 14, marginTop: 8 },
  setDefaultText: { fontSize: 12, fontWeight: "600", marginTop: 8 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
