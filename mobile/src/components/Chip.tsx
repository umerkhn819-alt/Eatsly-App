import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.surfaceMuted,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? "#FFFFFF" : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});
