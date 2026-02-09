import axios from "axios";
import { getVisitorId } from "./visitor";

// Use relative /api path - Next.js rewrites proxy to backend (avoids CORS)
// Override with NEXT_PUBLIC_API_URL for production or different backend (must include /v1)
const baseURL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the token, visitor ID, and language
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof window !== "undefined") {
      const visitorId = getVisitorId();
      if (visitorId) {
        config.headers["X-Visitor-ID"] = visitorId;
      }
      const lang = localStorage.getItem("preferred_lang");
      if (lang) {
        config.params = { ...(config.params || {}), lang };
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Don't logout when 401 is from login endpoint (wrong credentials)
            const url = error.config?.url || "";
            if (url.includes("/auth/login")) {
                return Promise.reject(error);
            }
            localStorage.removeItem("token");
            // Update auth store so UI reflects logged-out state (avoids stale isAuthenticated)
            import("@/stores/useAuthStore").then(({ useAuthStore }) => {
                useAuthStore.getState().logout();
            });
        }
        return Promise.reject(error);
    }
);

export default api;
