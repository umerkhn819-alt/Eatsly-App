import React from "react";
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from "react-native";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  elevated?: boolean;
  children: React.ReactNode;
} & ({ onPress: NonNullable<PressableProps["onPress"]> } | { onPress?: undefined }) &
  Omit<ViewProps, "children">;

export function Card({ children, elevated = false, onPress, style, ...rest }: Props) {
  const { colors } = useTheme();
  const merged = [
    styles.base,
    { backgroundColor: colors.surface, borderColor: colors.border },
    elevated && {
      shadowColor: colors.cardShadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        {...rest}
        onPress={onPress}
        style={({ pressed }) => [merged, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View {...rest} style={merged}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
});
