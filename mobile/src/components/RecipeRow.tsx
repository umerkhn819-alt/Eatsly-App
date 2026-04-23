import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RecipePublic } from "../api/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  recipe: RecipePublic;
  onPress: () => void;
};

export function RecipeRow({ recipe, onPress }: Props) {
  const { colors } = useTheme();
  const tagPreview =
    recipe.tags.length > 0 ? recipe.tags.slice(0, 3).join(" · ") : "No tags";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: colors.surface },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
          {tagPreview}
        </Text>
      </View>
      <Text style={[styles.chev, { color: colors.textMuted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  meta: {
    fontSize: 14,
  },
  chev: {
    fontSize: 22,
    marginLeft: spacing.sm,
  },
});
