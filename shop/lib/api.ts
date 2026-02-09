import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getVisitorId } from "./visitor";

// Use 127.0.0.1 so connections hit IPv4; localhost can resolve to ::1 and fail on macOS.
// Normalize at runtime so even if .env sets EXPO_PUBLIC_API_URL to localhost, we use 127.0.0.1.
function getBaseURL(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000/v1";
  if (raw.includes("localhost")) {
    return raw.replace(/localhost/g, "127.0.0.1");
  }
  return raw;
}

const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const visitorId = await getVisitorId();
  if (visitorId) config.headers["X-Visitor-ID"] = visitorId;
  const lang = await AsyncStorage.getItem("preferred_lang");
  if (lang && config.url) {
    const sep = config.url.includes("?") ? "&" : "?";
    config.url = `${config.url}${sep}lang=${encodeURIComponent(lang)}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.removeItem("token");
      const { useAuthStore } = await import("@/stores/useAuthStore");
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export default api;
