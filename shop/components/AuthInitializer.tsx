import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/stores/useAuthStore";

const TOKEN_KEY = "token";

export function AuthInitializer() {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        useAuthStore.setState({ token, isAuthenticated: true });
        await fetchUser();
      }
    })();
  }, [fetchUser]);

  return null;
}
