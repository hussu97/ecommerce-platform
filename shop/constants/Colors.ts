// Design tokens – keep in sync with customer-web/app/theme.css and admin-web/src/theme.css (see .cursor/rules/design-tokens-sync.mdc)
const primary = "#ec9213";
const backgroundLight = "#f8f7f6";
const backgroundDark = "#221a10";
const sandDivider = "#e5e1da";
const textMuted = "#897961";
const surfaceLight = "#ffffff";
const surfaceDark = "#2d2419";
const borderDark = "#3d3123";
const textPrimary = "#181511";
const mutedDark = "#c4b5a0";

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
