// Design tokens from single source: @ecommerce/design-tokens
import tokens from "@ecommerce/design-tokens";

const {
  primary,
  backgroundLight,
  backgroundDark,
  sandDivider,
  textMuted,
  surfaceLight,
  surfaceDark,
  borderDark,
  textPrimary,
  mutedDark,
} = tokens;

const tintColorLight = primary;
const tintColorDark = primary;

export default {
  light: {
    text: textPrimary,
    background: backgroundLight,
    surface: surfaceLight,
    primary,
    secondary: primary,
    tint: tintColorLight,
    tabIconDefault: textMuted,
    tabIconSelected: tintColorLight,
    sandDivider,
    textMuted,
    border: sandDivider,
  },
  dark: {
    text: "#f8f7f6",
    background: backgroundDark,
    surface: surfaceDark,
    primary,
    secondary: primary,
    tint: tintColorDark,
    tabIconDefault: mutedDark,
    tabIconSelected: tintColorDark,
    sandDivider: borderDark,
    textMuted: mutedDark,
    border: borderDark,
  },
};

export const DesignTokens = {
  primary,
  backgroundLight,
  backgroundDark,
  sandDivider,
  textMuted,
  textPrimary,
  surfaceLight,
  surfaceDark,
  borderDark,
};
