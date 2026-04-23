import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export function EmptyState({ icon = "sparkles-outline", title, body }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={24} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
