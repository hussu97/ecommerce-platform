import axios from "axios";
import { getVisitorId } from "./visitor";

// Browser: use /api (Next.js rewrites to backend). Server (SSR): use BACKEND_ORIGIN in Docker or localhost.
// NEXT_PUBLIC_API_URL overrides when set (must end with /v1 for full URL).
// Avoid mixed content: if page is HTTPS and API URL is HTTP, use /api so the request goes same-origin.
function getBaseURL(): string {
  const isBrowser = typeof window !== "undefined";
  const backendOrigin = process.env.BACKEND_ORIGIN;
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  let raw: string;
  if (publicUrl && isBrowser) {
    const pageProto = typeof window !== "undefined" ? window.location?.protocol?.toLowerCase() : "";
    const apiIsHttp = publicUrl.toLowerCase().startsWith("http://");
    if (pageProto === "https:" && apiIsHttp) {
      raw = "/api";
    } else {
      raw = publicUrl;
    }
  } else if (publicUrl) {
    raw = publicUrl;
  } else if (isBrowser) {
    raw = "/api";
  } else {
    raw = backendOrigin ? `${backendOrigin}/v1` : "http://127.0.0.1:8000/v1";
  }
  if (raw.startsWith("http") && !raw.replace(/\/$/, "").endsWith("/v1")) {
    raw = raw.replace(/\/?$/, "") + "/v1";
  }
  // Avoid localhost resolving to IPv6 (::1) on macOS; use 127.0.0.1 for connection URLs
  if (raw.startsWith("http") && raw.includes("localhost")) {
    raw = raw.replace(/localhost/g, "127.0.0.1");
  }
  return raw;
}

/** Normalize API error response detail to a string (avoids rendering 422 validation array as React child). */
export function getApiErrorDetail(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first !== null && "msg" in first) return String((first as { msg?: unknown }).msg ?? fallback);
  }
  if (typeof detail === "object" && detail !== null && "msg" in detail) return String((detail as { msg?: unknown }).msg ?? fallback);
  return fallback;
}

const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
  timeout: 30000,
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
