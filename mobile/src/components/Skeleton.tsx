import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  height: number;
  width?: number | `${number}%`;
  borderRadius?: number;
};

export function Skeleton({ height, width = "100%", borderRadius = 12 }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { height, width, borderRadius, opacity, backgroundColor: colors.surfaceMuted },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: "hidden",
  },
});
