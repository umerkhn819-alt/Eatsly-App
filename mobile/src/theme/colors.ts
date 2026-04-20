export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryPressed: string;
  danger: string;
  dangerSurface: string;
  cardShadow: string;
};

export const lightColors: ThemeColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  text: "#0F172A",
  textMuted: "#475569",
  border: "#E2E8F0",
  primary: "#EA580C",
  primaryPressed: "#C2410C",
  danger: "#B91C1C",
  dangerSurface: "#FEE2E2",
  cardShadow: "rgba(15, 23, 42, 0.08)",
};

export const darkColors: ThemeColors = {
  background: "#111111",
  surface: "#1E1E1E",
  surfaceMuted: "#252525",
  text: "#FFFFFF",
  textMuted: "#999999",
  border: "#2E2E2E",
  primary: "#FF6B35",
  primaryPressed: "#E55A25",
  danger: "#FF4D4D",
  dangerSurface: "#2D1212",
  cardShadow: "rgba(0, 0, 0, 0.5)",
};

// Backward-compatible default for components not yet migrated.
export const colors = lightColors;
