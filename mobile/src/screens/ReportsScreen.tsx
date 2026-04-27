import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as favoritesApi from "../api/favoritesApi";
import * as recipesApi from "../api/recipesApi";
import { useCart } from "../cart/CartContext";
import type { ReportsTabScreenProps } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

const BAR_DATA = [
  { label: "Mon", value: 480 },
  { label: "Tue", value: 620 },
  { label: "Wed", value: 390 },
  { label: "Thu", value: 710 },
  { label: "Fri", value: 550 },
  { label: "Sat", value: 830 },
  { label: "Sun", value: 460 },
];
const MAX_BAR = Math.max(...BAR_DATA.map((d) => d.value));

function AnimatedBar({ value, color }: { value: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const targetHeight = (value / MAX_BAR) * 120;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: targetHeight,
      duration: 700,
      delay: Math.random() * 200,
      useNativeDriver: false,
    }).start();
  }, [anim, targetHeight]);

  return (
    <Animated.View
      style={{ width: 28, height: anim, borderRadius: 6, backgroundColor: color }}
    />
  );
}

type Stat = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
};

export function ReportsScreen(_props: ReportsTabScreenProps) {
  const { colors } = useTheme();
  const { items: cartItems } = useCart();
  const [recipeCount, setRecipeCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const checkedCount = cartItems.filter((i) => i.checked).length;

  useEffect(() => {
    recipesApi
      .listRecipes({ mine: true, limit: 1, offset: 0 })
      .then((r) => setRecipeCount(r.total))
      .catch(() => {});
    favoritesApi
      .listFavorites({ limit: 1, offset: 0 })
      .then((r) => setFavCount(r.total ?? r.recipes.length))
      .catch(() => {});
  }, []);

  const stats: Stat[] = [
    { icon: "restaurant", iconColor: "#fff", value: String(recipeCount), label: "Recipes Created" },
    { icon: "flame", iconColor: "#FF6B35", value: "512", label: "Avg Calories" },
    { icon: "heart", iconColor: "#FF4D6D", value: String(favCount), label: "Favorites Saved" },
    { icon: "checkmark-circle", iconColor: "#2DC653", value: String(checkedCount), label: "Items Checked" },
  ];

  const bg = colors.background;
  const surface = colors.surface;
  const primary = colors.primary;
  const text = colors.text;
  const muted = colors.textMuted;
  const border = colors.border;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.categoryTag, { color: primary }]}>📊 ANALYTICS</Text>
          <Text style={[styles.heading, { color: text }]}>
            Your Food{" "}
            <Text style={[styles.heading, { color: primary }]}>Reports</Text>
          </Text>
          <Text style={[styles.subheading, { color: muted }]}>
            Insights into your cooking journey
          </Text>
        </View>

        {/* Stats 2x2 grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: surface, borderColor: border }]}
            >
              <Ionicons name={s.icon} size={26} color={s.iconColor} />
              <Text style={[styles.statValue, { color: s.iconColor === "#fff" ? text : s.iconColor }]}>
                {s.value}
              </Text>
              <Text style={[styles.statLabel, { color: muted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Calorie distribution chart */}
        <View style={[styles.chartCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.chartHeader}>
            <Ionicons name="flame" size={16} color={primary} />
            <Text style={[styles.chartTitle, { color: text }]}>Calorie Distribution</Text>
          </View>
          <View style={styles.chartBars}>
            {BAR_DATA.map((d) => (
              <View key={d.label} style={styles.barCol}>
                <AnimatedBar value={d.value} color={primary} />
                <Text style={[styles.barLabel, { color: muted }]}>{d.label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.chartDivider, { borderTopColor: border }]} />
          <View style={styles.chartLegend}>
            <Text style={[styles.legendLabel, { color: muted }]}>Weekly avg:</Text>
            <Text style={[styles.legendValue, { color: primary }]}>
              {Math.round(BAR_DATA.reduce((a, b) => a + b.value, 0) / BAR_DATA.length)} kcal
            </Text>
          </View>
        </View>

        {/* Cooking streak */}
        <View style={[styles.streakCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.streakRow}>
            <View style={[styles.streakIcon, { backgroundColor: primary + "22" }]}>
              <Ionicons name="trophy" size={22} color={primary} />
            </View>
            <View style={styles.streakText}>
              <Text style={[styles.streakTitle, { color: text }]}>Cooking Streak</Text>
              <Text style={[styles.streakSub, { color: muted }]}>Keep cooking to grow your streak</Text>
            </View>
            <Text style={[styles.streakNum, { color: primary }]}>3 🔥</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 32 },
  headerBlock: { gap: 4, marginBottom: spacing.sm },
  categoryTag: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  heading: { fontSize: 28, fontWeight: "800" },
  subheading: { fontSize: 14, marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  statValue: { fontSize: 32, fontWeight: "800", lineHeight: 38 },
  statLabel: { fontSize: 13 },
  chartCard: { borderRadius: 18, borderWidth: 1, padding: spacing.md },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  chartTitle: { fontSize: 16, fontWeight: "800" },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 130 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  barLabel: { fontSize: 10, fontWeight: "600" },
  chartDivider: { borderTopWidth: 1, marginVertical: spacing.sm },
  chartLegend: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  legendLabel: { fontSize: 13 },
  legendValue: { fontSize: 15, fontWeight: "800" },
  streakCard: { borderRadius: 18, borderWidth: 1, padding: spacing.md },
  streakRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  streakIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  streakText: { flex: 1 },
  streakTitle: { fontSize: 16, fontWeight: "700" },
  streakSub: { fontSize: 12, marginTop: 2 },
  streakNum: { fontSize: 24, fontWeight: "800" },
});
