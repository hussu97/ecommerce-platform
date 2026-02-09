import { Platform } from "react-native";

// Serif for headings / product names; Sans for body.
// Design token intent: display/sans from packages/design-tokens (Noto Serif, Noto Sans on web).
// Platform-specific fallbacks below for native (Georgia, System, serif) so app UI can feel native.
export const FontFamily = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }) as string,
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "sans-serif" }) as string,
};
