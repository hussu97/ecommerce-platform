import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, ScrollView, View } from "react-native";
import { Text } from "@/components/Themed";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";

const ADDRESS_TYPES = ["home", "office", "other"] as const;

export default function NewAddressScreen() {
  const { isAuthenticated } = useAuthStore();
  const t = useI18nStore((s) => s.t);
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const fromCheckout = returnTo === "/checkout";
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    contact_name: "",
    phone: "",
    address_type: "home" as (typeof ADDRESS_TYPES)[number],
    street: "",
    city: "",
    country: "United Arab Emirates",
    postal_code: "",
    state_province: "",
    label: "",
    company_name: "",
    building_name: "",
    floor_office: "",
    is_default: false,
  });

  if (!isAuthenticated) {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async () => {
    setError("");
    if (!form.contact_name.trim() || !form.phone.trim() || !form.street.trim() || !form.city.trim() || !form.country.trim()) {
      setError(t("please_fill_required"));
      return;
    }
    setSaving(true);
    try {
      await api.post("/addresses", {
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        address_type: form.address_type,
        street: form.street.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        postal_code: form.postal_code.trim() || undefined,
        state_province: form.state_province.trim() || undefined,
        label: form.address_type === "other" ? form.label.trim() || undefined : undefined,
        company_name: form.address_type === "office" ? form.company_name.trim() || undefined : undefined,
        building_name: form.building_name.trim() || undefined,
        floor_office: form.floor_office.trim() || undefined,
        is_default: fromCheckout || form.is_default,
      });
      router.replace(fromCheckout ? "/checkout" : "/addresses");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t("failed_to_save_address"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.sandDivider }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("add_new_address")}</Text>
        <View style={styles.headerBtn} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("contact_name")}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
          value={form.contact_name}
          onChangeText={(v) => setForm({ ...form, contact_name: v })}
          placeholder={t("full_name")}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("phone")}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
          value={form.phone}
          onChangeText={(v) => setForm({ ...form, phone: v })}
          placeholder={t("mobile_placeholder")}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("address_type")}</Text>
        <View style={styles.typeRow}>
          {ADDRESS_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeBtn,
                { borderColor: colors.sandDivider, backgroundColor: colors.surface },
                form.address_type === type && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
              ]}
              onPress={() => setForm({ ...form, address_type: type })}
            >
              <Text style={[styles.typeBtnText, { color: colors.text }, form.address_type === type && { color: colors.primary, fontWeight: "700" }]}>
                {type === "home" ? t("address_type_home") : type === "office" ? t("address_type_office") : t("address_type_other")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {form.address_type === "office" && (
          <>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t("company_name")}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
              value={form.company_name}
              onChangeText={(v) => setForm({ ...form, company_name: v })}
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("street_address_placeholder")}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
          value={form.street}
          onChangeText={(v) => setForm({ ...form, street: v })}
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t("city_placeholder")}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
              value={form.city}
              onChangeText={(v) => setForm({ ...form, city: v })}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t("emirate_placeholder")}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
              value={form.state_province}
              onChangeText={(v) => setForm({ ...form, state_province: v })}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("floor_office")}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
          value={form.floor_office}
          onChangeText={(v) => setForm({ ...form, floor_office: v })}
          placeholder="Level / Apt"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("country")}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
          value={form.country}
          onChangeText={(v) => setForm({ ...form, country: v })}
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity
          style={[styles.checkRow, { borderColor: colors.sandDivider }]}
          onPress={() => setForm({ ...form, is_default: !form.is_default })}
        >
          <View style={[styles.checkbox, form.is_default && { backgroundColor: colors.primary }]} />
          <Text style={[styles.checkLabel, { color: colors.text }]}>{t("set_as_default")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.submitBtnText}>{saving ? t("processing") : t("add_new_address")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  error: { color: "#b91c1c", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  typeBtnText: { fontSize: 14 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#e5e1da" },
  checkLabel: { fontSize: 15 },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
