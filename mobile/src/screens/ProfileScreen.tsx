import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as adminApi from "../api/adminApi";
import * as recipesApi from "../api/recipesApi";
import { useAuth } from "../auth/AuthContext";
import { FormErrorText } from "../components/FormErrorText";
import type { ProfileTabScreenProps } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type DietMode = "none" | "gym" | "loss" | "budget";

const DIET_OPTIONS: { id: DietMode; label: string; sub: string; icon: string }[] = [
  { id: "none", label: "No Preference", sub: "Anything goes", icon: "🍽️" },
  { id: "gym", label: "Gym / Bulk", sub: "High protein gains", icon: "💪" },
  { id: "loss", label: "Weight Loss", sub: "Clean & light", icon: "🥗" },
  { id: "budget", label: "Budget", sub: "Affordable meals", icon: "💰" },
];

export function ProfileScreen(_props: ProfileTabScreenProps) {
  const { user, signOut } = useAuth();
  const { colors, resolvedMode, toggleMode } = useTheme();
  const [dietMode, setDietMode] = useState<DietMode>("none");
  const [recipeCount, setRecipeCount] = useState(0);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    recipesApi
      .listRecipes({ mine: true, limit: 1, offset: 0 })
      .then((r) => setRecipeCount(r.total))
      .catch(() => {});
  }, []);

  if (!user) return null;

  const initial = (user.email?.[0] ?? "U").toUpperCase();
  const displayName = user.email?.split("@")[0] ?? "User";

  const bg = colors.background;
  const surface = colors.surface;
  const primary = colors.primary;
  const text = colors.text;
  const muted = colors.textMuted;
  const border = colors.border;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header row */}
        <View style={styles.topRow}>
          <Text style={[styles.pageTitle, { color: text }]}>Profile</Text>
          <Pressable
            onPress={() => void signOut()}
            style={[styles.signOutBtn, { backgroundColor: surface, borderColor: border }]}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={20} color={muted} />
          </Pressable>
        </View>

        {/* Avatar + info card */}
        <View style={[styles.userCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.avatar, { backgroundColor: primary }]}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: text }]}>{displayName}</Text>
            <Text style={[styles.userEmail, { color: muted }]}>{user.email}</Text>
          </View>
          <View style={[styles.recipeBadge, { backgroundColor: primary + "22" }]}>
            <Text style={[styles.recipeBadgeNum, { color: primary }]}>{recipeCount}</Text>
            <Text style={[styles.recipeBadgeLabel, { color: muted }]}>Recipes</Text>
          </View>
        </View>

        {/* Diet mode */}
        <Text style={[styles.sectionLabel, { color: muted }]}>DIET MODE</Text>
        <View style={[styles.dietCard, { backgroundColor: surface, borderColor: border }]}>
          {DIET_OPTIONS.map((opt, idx) => {
            const selected = dietMode === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setDietMode(opt.id)}
                style={[
                  styles.dietRow,
                  idx < DIET_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: border },
                  selected && { backgroundColor: primary + "11" },
                ]}
              >
                <Text style={styles.dietEmoji}>{opt.icon}</Text>
                <View style={styles.dietText}>
                  <Text style={[styles.dietLabel, { color: text }]}>{opt.label}</Text>
                  <Text style={[styles.dietSub, { color: muted }]}>{opt.sub}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    { borderColor: selected ? primary : border },
                    selected && { backgroundColor: primary },
                  ]}
                >
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Settings */}
        <Text style={[styles.sectionLabel, { color: muted }]}>SETTINGS</Text>
        <View style={[styles.settingsCard, { backgroundColor: surface, borderColor: border }]}>
          {/* Theme row */}
          <Pressable
            onPress={toggleMode}
            style={[styles.settingRow, { borderBottomColor: border }]}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons
                name={resolvedMode === "dark" ? "moon" : "sunny"}
                size={18}
                color={primary}
              />
            </View>
            <Text style={[styles.settingLabel, { color: text }]}>
              {resolvedMode === "dark" ? "Dark mode" : "Light mode"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={muted} />
          </Pressable>

          {/* Role */}
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={primary} />
            </View>
            <Text style={[styles.settingLabel, { color: text }]}>Account role</Text>
            <Text style={[styles.settingValue, { color: muted }]}>{user.role}</Text>
          </View>
        </View>

        {/* Admin seed (admin only) */}
        {user.role === "admin" && (
          <>
            <Text style={[styles.sectionLabel, { color: muted }]}>ADMIN</Text>
            <View style={[styles.settingsCard, { backgroundColor: surface, borderColor: border }]}>
              <Pressable
                onPress={async () => {
                  setSeedBusy(true);
                  setSeedError(null);
                  setSeedMsg(null);
                  try {
                    const res = await adminApi.seedRecipes();
                    setSeedMsg(
                      res.inserted > 0
                        ? `Inserted ${res.inserted} recipes`
                        : "Recipes already seeded",
                    );
                  } catch (err) {
                    setSeedError(err instanceof Error ? err.message : "Seed failed");
                  } finally {
                    setSeedBusy(false);
                  }
                }}
                disabled={seedBusy}
                style={[styles.settingRow, { borderBottomWidth: 0, opacity: seedBusy ? 0.6 : 1 }]}
              >
                <View style={[styles.settingIcon, { backgroundColor: colors.surfaceMuted }]}>
                  <Ionicons name="cloud-upload-outline" size={18} color={primary} />
                </View>
                <Text style={[styles.settingLabel, { color: text }]}>
                  {seedBusy ? "Seeding..." : "Seed starter recipes"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>
            </View>
            {seedMsg ? (
              <Text style={[styles.infoText, { color: primary }]}>{seedMsg}</Text>
            ) : null}
            <FormErrorText message={seedError} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pageTitle: { fontSize: 24, fontWeight: "800" },
  signOutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontSize: 22, fontWeight: "800" },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: "800" },
  userEmail: { fontSize: 12, marginTop: 2 },
  recipeBadge: { alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  recipeBadgeNum: { fontSize: 18, fontWeight: "800" },
  recipeBadgeLabel: { fontSize: 11 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  dietCard: { marginHorizontal: spacing.lg, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  dietRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  dietEmoji: { fontSize: 22 },
  dietText: { flex: 1 },
  dietLabel: { fontSize: 15, fontWeight: "700" },
  dietSub: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  settingsCard: { marginHorizontal: spacing.lg, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  settingValue: { fontSize: 13 },
  infoText: { paddingHorizontal: spacing.lg, marginTop: 6, fontSize: 13, fontWeight: "700" },
});
