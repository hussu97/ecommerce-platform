import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { Text } from "@/components/Themed";
import { Link, useRouter } from "expo-router";
import api from "@/lib/api";
import { useI18nStore } from "@/stores/useI18nStore";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const handleSignup = async () => {
    setError("");
    if (password !== confirmPassword) {
      setError(t("passwords_do_not_match"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/signup", { email, full_name: fullName, password });
      router.replace("/login");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("failed_to_create_account");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
          <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>{t("sign_up_title")}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
            placeholder={t("full_name")}
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
            placeholder={t("email")}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
            placeholder={t("password")}
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={[styles.input, { borderColor: colors.sandDivider, color: colors.text }]}
            placeholder={t("confirm_password")}
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {error ? <Text style={[styles.error, { color: colors.textMuted }]}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? t("processing") : t("create_your_account")}
            </Text>
          </TouchableOpacity>
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.link}>
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {t("already_have_account")} {t("sign_in")}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  form: { padding: 24, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  error: { marginBottom: 12 },
  btn: { padding: 14, borderRadius: 12, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  link: { marginTop: 16, alignItems: "center" },
  linkText: { fontSize: 14 },
});
