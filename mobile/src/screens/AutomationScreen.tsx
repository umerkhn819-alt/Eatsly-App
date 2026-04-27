import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AutomationTabScreenProps } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type WorkflowStatus = "idle" | "running" | "done";

type Workflow = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
};

const WORKFLOWS: Workflow[] = [
  {
    id: "1",
    title: "Weekly Meal Planner",
    description: "Auto-generate a 7-day meal plan based on your diet mode and calorie goals",
    icon: "calendar",
    accentColor: "#00B4D8",
  },
  {
    id: "2",
    title: "Smart Grocery Restock",
    description: "Scan your last 5 recipes and auto-build a complete grocery shopping list",
    icon: "cart",
    accentColor: "#2DC653",
  },
  {
    id: "3",
    title: "Quick Meal Bundle",
    description: "Generate 3 quick meals under 20 mins using your pantry ingredients",
    icon: "flash",
    accentColor: "#FFB703",
  },
  {
    id: "4",
    title: "Budget Week Pack",
    description: "Plan 5 affordable dinners staying under a set budget per serving",
    icon: "cash",
    accentColor: "#9B5DE5",
  },
];

export function AutomationScreen(_props: AutomationTabScreenProps) {
  const { colors } = useTheme();
  const [statuses, setStatuses] = useState<Record<string, WorkflowStatus>>({});

  function runWorkflow(id: string) {
    setStatuses((prev) => ({ ...prev, [id]: "running" }));
    setTimeout(
      () => setStatuses((prev) => ({ ...prev, [id]: "done" })),
      2000,
    );
  }

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
          <Text style={[styles.categoryTag, { color: primary }]}>⚡ AUTOMATION</Text>
          <Text style={[styles.heading, { color: text }]}>
            Workflow{" "}
            <Text style={[styles.heading, { color: primary }]}>Automation</Text>
          </Text>
          <Text style={[styles.subheading, { color: muted }]}>
            Run smart automations with one tap
          </Text>
        </View>

        {/* Workflow cards */}
        {WORKFLOWS.map((wf) => {
          const status = statuses[wf.id] ?? "idle";
          const isRunning = status === "running";
          const isDone = status === "done";

          return (
            <View
              key={wf.id}
              style={[styles.card, { backgroundColor: surface, borderColor: border }]}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.iconSquare,
                    { backgroundColor: wf.accentColor + "22" },
                  ]}
                >
                  <Ionicons name={wf.icon} size={24} color={wf.accentColor} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: text }]}>{wf.title}</Text>
                  <Text style={[styles.cardDesc, { color: muted }]}>{wf.description}</Text>
                </View>
              </View>

              {/* Progress dots */}
              <View style={styles.dotsRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          isDone && i < 4
                            ? wf.accentColor
                            : isRunning && i === 0
                            ? wf.accentColor
                            : border,
                        width: isRunning && i === 0 ? 24 : 8,
                      },
                    ]}
                  />
                ))}
              </View>

              <Pressable
                onPress={() => !isRunning && runWorkflow(wf.id)}
                style={[
                  styles.runBtn,
                  {
                    backgroundColor: isDone ? wf.accentColor + "22" : "transparent",
                    borderColor: isDone ? wf.accentColor : primary,
                  },
                ]}
              >
                {isRunning ? (
                  <ActivityIndicator size="small" color={primary} />
                ) : (
                  <>
                    <Ionicons
                      name={isDone ? "checkmark-circle" : "play"}
                      size={14}
                      color={isDone ? wf.accentColor : primary}
                    />
                    <Text
                      style={[
                        styles.runLabel,
                        { color: isDone ? wf.accentColor : primary },
                      ]}
                    >
                      {isDone ? "Completed" : "Run Workflow"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          );
        })}
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
  card: { borderWidth: 1, borderRadius: 18, padding: spacing.md, gap: spacing.md },
  cardTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  iconSquare: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardDesc: { fontSize: 13, lineHeight: 19 },
  dotsRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { height: 6, borderRadius: 3 },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  runLabel: { fontSize: 14, fontWeight: "700" },
});
