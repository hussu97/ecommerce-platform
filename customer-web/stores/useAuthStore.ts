import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (token: string) => {
                localStorage.setItem("token", token);
                set({ token, isAuthenticated: true });

                // Fetch user details - required for login to succeed
                try {
                    const response = await api.get("/users/me");
                    set({ user: response.data });
                } catch (error) {
                    console.error("Failed to fetch user profile", error);
                    // Auth failed (e.g. 401) - clear token and don't mark as authenticated
                    localStorage.removeItem("token");
                    set({ user: null, token: null, isAuthenticated: false });
                    throw error;
                }

                // Merge guest cart into user cart (X-Visitor-ID is sent by api interceptor)
                try {
                    await api.post("/cart/merge");
                } catch (e) {
                    // Ignore - may fail if no visitor cart
                }
            },

            logout: () => {
                localStorage.removeItem("token");
                set({ user: null, token: null, isAuthenticated: false });
                // Optional: Redirect to home or login page via router in component
            },

            fetchUser: async () => {
                try {
                    const response = await api.get("/users/me");
                    set({ user: response.data, isAuthenticated: true });
                } catch (error) {
                    console.error("Failed to fetch user", error);
                    set({ user: null, token: null, isAuthenticated: false });
                    localStorage.removeItem("token");
                }
            },
        }),
        {
            name: "auth-storage", // name of the item in the storage (must be unique)
            partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
            onRehydrateStorage: () => (state, err) => {
                // Sync token to localStorage when rehydrating so the API interceptor can use it.
                // The API interceptor reads localStorage.token; persist only stores in auth-storage.
                if (!err && state?.token && typeof window !== "undefined") {
                    localStorage.setItem("token", state.token);
                }
            },
        }
    )
);
