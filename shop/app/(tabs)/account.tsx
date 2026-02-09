import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";

export default function AccountScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const t = useI18nStore((s) => s.t);
  const { currentLanguage, languages, setLanguage } = useI18nStore();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  if (!isAuthenticated) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
          <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("account_and_lists")}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t("sign_in_or_sign_up_hint")}</Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/login")}
            activeOpacity={0.85}
          >
            <FontAwesome name="sign-in" size={20} color="#fff" />
            <Text style={styles.btnPrimaryText}>{t("sign_in")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: colors.sandDivider }]}
            onPress={() => router.push("/signup")}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>{t("sign_up")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("language")}</Text>
        <View style={styles.langRow}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.id}
              style={[
                styles.langBtn,
                { borderColor: colors.sandDivider, backgroundColor: colors.surface },
                currentLanguage?.code === lang.code && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setLanguage(lang)}
            >
              <Text
                style={[
                  styles.langBtnText,
                  { color: colors.text },
                  currentLanguage?.code === lang.code && styles.langBtnTextActive,
                ]}
              >
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
        <Text style={[styles.greeting, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("hello")}, {user?.full_name?.split(" ")[0] || t("profile")}
        </Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>

        <TouchableOpacity
          style={[styles.menuBtn, { borderColor: colors.sandDivider, backgroundColor: colors.surface }]}
          onPress={() => router.push("/profile")}
          activeOpacity={0.85}
        >
          <FontAwesome name="user" size={20} color={colors.primary} />
          <Text style={[styles.menuBtnText, { color: colors.text }]}>{t("your_profile")}</Text>
          <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuBtn, { borderColor: colors.sandDivider, backgroundColor: colors.surface }]}
          onPress={() => router.push("/orders")}
          activeOpacity={0.85}
        >
          <FontAwesome name="list" size={20} color={colors.primary} />
          <Text style={[styles.menuBtnText, { color: colors.text }]}>{t("returns_and_orders")}</Text>
          <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuBtn, { borderColor: colors.sandDivider, backgroundColor: colors.surface }]}
          onPress={() => router.push("/wishlist")}
          activeOpacity={0.85}
        >
          <FontAwesome name="heart" size={20} color={colors.primary} />
          <Text style={[styles.menuBtnText, { color: colors.text }]}>{t("wishlist")}</Text>
          <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuBtn, { borderColor: colors.sandDivider, backgroundColor: colors.surface }]}
          onPress={() => router.push("/addresses")}
          activeOpacity={0.85}
        >
          <FontAwesome name="map-marker" size={20} color={colors.primary} />
          <Text style={[styles.menuBtnText, { color: colors.text }]}>{t("shipping_addresses")}</Text>
          <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("language")}</Text>
      <View style={styles.langRow}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.id}
            style={[
              styles.langBtn,
              { borderColor: colors.sandDivider, backgroundColor: colors.surface },
              currentLanguage?.code === lang.code && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setLanguage(lang)}
          >
            <Text
              style={[
                styles.langBtnText,
                { color: colors.text },
                currentLanguage?.code === lang.code && styles.langBtnTextActive,
              ]}
            >
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  email: { fontSize: 14, marginBottom: 20 },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  menuBtnText: { fontSize: 16, fontWeight: "600", flex: 1 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  btnSecondary: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  btnSecondaryText: { fontWeight: "600", fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  langBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9999,
    borderWidth: 1,
  },
  langBtnText: { fontSize: 14 },
  langBtnTextActive: { color: "#fff", fontWeight: "600" },
});
