export interface DesignTokensColors {
  primary: string;
  backgroundLight: string;
  backgroundDark: string;
  sandDivider: string;
  sandMuted: string;
  darkCard: string;
  darkBorder: string;
  textPrimary: string;
  textMuted: string;
  mutedDark: string;
  gold: string;
  surfaceLight: string;
  surfaceDark: string;
}

export interface DesignTokensRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  full: string;
}

export interface DesignTokensTypography {
  fontDisplay: string;
  fontSans: string;
}

export const colors: DesignTokensColors;
export const radius: DesignTokensRadius;
export const typography: DesignTokensTypography;

declare const tokens: DesignTokensColors & DesignTokensRadius & DesignTokensTypography;
export default tokens;
