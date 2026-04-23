import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  headline: string;
  subline: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthScreenLayout({
  headline,
  subline,
  showBack = false,
  onBack,
  children,
  footer,
}: Props) {
  const { colors } = useTheme();
  const tint = colors.primary + "22";
  const ringBorder = colors.primary + "40";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.outer}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          ) : null}

          <View style={[styles.hero, showBack ? styles.heroTightTop : styles.heroLooseTop]}>
            <View style={[styles.logoRing, { backgroundColor: tint, borderColor: ringBorder }]}>
              <Ionicons name="restaurant" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.brand, { color: colors.primary }]}>Tastie</Text>
            <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text>
            <Text style={[styles.subline, { color: colors.textMuted }]} numberOfLines={2}>
              {subline}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {children}
          </View>

          <View style={styles.footer}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  outer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  hero: {
    alignItems: "center",
  },
  heroLooseTop: {
    paddingTop: spacing.lg,
  },
  heroTightTop: {
    paddingTop: spacing.xs,
  },
  logoRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  brand: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 2,
  },
  headline: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subline: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
