import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/lib/api";

const TOKEN_KEY = "token";

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async (token: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
    try {
      const res = await api.get("/users/me");
      set({ user: res.data });
    } catch {
      // User will be fetched lazily on next fetchUser(); login still succeeds (token stored)
      set({ user: null });
    }
    try {
      await api.post("/cart/merge");
    } catch {
      // Ignore - may fail if no visitor cart or network glitch
    }
  },
  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },
  fetchUser: async () => {
    try {
      const res = await api.get("/users/me");
      set({ user: res.data, isAuthenticated: true });
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
