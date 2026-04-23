import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  message: string | null;
};

export function FormErrorText({ message }: Props) {
  const { colors } = useTheme();
  if (!message) {
    return null;
  }

  return (
    <View
      style={[styles.box, { borderColor: colors.danger, backgroundColor: colors.dangerSurface }]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
