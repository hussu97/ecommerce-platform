import { Platform } from "react-native";

// Serif for headings / product names; Sans for body.
// Use Noto Serif / Noto Sans when loaded via expo-font; fallback to system.
export const FontFamily = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }) as string,
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "sans-serif" }) as string,
};
