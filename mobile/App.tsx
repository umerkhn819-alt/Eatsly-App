import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { CartProvider } from "./src/cart/CartContext";
import { readApiBaseUrl } from "./src/config/env";
import { configureHttpClient } from "./src/api/http";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { colors } from "./src/theme/colors";
import { spacing } from "./src/theme/spacing";

function MissingApiUrlScreen() {
  return (
    <View style={styles.missingWrap} accessibilityRole="alert">
      <Text style={styles.missingTitle}>Configuration required</Text>
      <Text style={styles.missingBody}>
        Create mobile/.env from mobile/.env.example and set{" "}
        <Text style={styles.mono}>EXPO_PUBLIC_API_URL</Text> to your TasteAI API
        base URL (no trailing slash). Restart Expo after changing env values.
      </Text>
    </View>
  );
}

export default function App() {
  const baseUrl = readApiBaseUrl();
  if (!baseUrl) {
    return <MissingApiUrlScreen />;
  }

  configureHttpClient(baseUrl);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function MainApp() {
  const { colors: themeColors, resolvedMode } = useTheme();
  return (
    <>
      <NavigationContainer
        theme={{
          dark: resolvedMode === "dark",
          colors: {
            primary: themeColors.primary,
            background: themeColors.background,
            card: themeColors.surface,
            text: themeColors.text,
            border: themeColors.border,
            notification: themeColors.primary,
          },
          fonts: {
            regular: { fontFamily: "System", fontWeight: "400" },
            medium: { fontFamily: "System", fontWeight: "500" },
            bold: { fontFamily: "System", fontWeight: "700" },
            heavy: { fontFamily: "System", fontWeight: "800" },
          },
        }}
      >
        <AuthProvider>
          <CartProvider>
            <RootNavigator />
          </CartProvider>
        </AuthProvider>
      </NavigationContainer>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
    </>
  );
}

const styles = StyleSheet.create({
  missingWrap: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  missingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  missingBody: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
  },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    color: colors.text,
    fontWeight: "700",
  },
});
