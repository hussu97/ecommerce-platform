import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, View } from "react-native";
import { Text } from "@/components/Themed";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import Colors from "@/constants/Colors";
import { FontFamily } from "@/constants/Typography";
import { useColorScheme } from "@/components/useColorScheme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirectTo = params.redirect || "/";
  const t = useI18nStore((s) => s.t);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      await login(res.data.access_token);
      router.replace(redirectTo as `/${string}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? t("login_failed");
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
      <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.sandDivider }]}>
        <Text style={[styles.title, { fontFamily: FontFamily.serif, color: colors.text }]}>
          {t("sign_in")}
        </Text>
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
        {error ? <Text style={[styles.error, { color: colors.textMuted }]}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? t("processing") : t("sign_in")}
          </Text>
        </TouchableOpacity>
        <Link href="/signup" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {t("dont_have_account")} {t("sign_up")}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
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
