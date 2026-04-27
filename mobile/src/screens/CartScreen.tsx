import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../cart/CartContext";
import type { CartItem } from "../cart/CartContext";
import { EmptyState } from "../components/EmptyState";
import type { CartStackScreenProps } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

const CATEGORY_COLORS: Record<string, string> = {
  Produce: "#2DC653",
  Protein: "#FF6B35",
  Dairy: "#00B4D8",
  Pantry: "#FFB703",
  Spices: "#9B5DE5",
  Other: "#888888",
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Produce: "leaf",
  Protein: "barbell",
  Dairy: "water",
  Pantry: "archive",
  Spices: "flame",
  Other: "ellipsis-horizontal",
};

function IngredientRow({
  item,
  onToggle,
  onIncrement,
  onDecrement,
}: {
  item: CartItem;
  onToggle: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.ingRow,
        { borderBottomColor: colors.border },
        item.checked && { opacity: 0.5 },
      ]}
    >
      <Pressable onPress={onToggle} hitSlop={8}>
        <Ionicons
          name={item.checked ? "checkbox" : "square-outline"}
          size={22}
          color={item.checked ? colors.primary : colors.textMuted}
        />
      </Pressable>
      <View style={styles.ingText}>
        <Text
          style={[
            styles.ingName,
            { color: colors.text },
            item.checked && styles.strikethrough,
          ]}
        >
          {item.name}
        </Text>
        {item.amount ? (
          <Text style={[styles.ingAmount, { color: colors.textMuted }]}>
            {item.amount}
          </Text>
        ) : null}
      </View>
      {/* Qty controls */}
      <View style={[styles.qtyRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Pressable onPress={onDecrement} hitSlop={6} style={styles.qtyBtn}>
          <Ionicons name="remove" size={14} color={colors.primary} />
        </Pressable>
        <Text style={[styles.qtyNum, { color: colors.text }]}>{item.qty}</Text>
        <Pressable onPress={onIncrement} hitSlop={6} style={styles.qtyBtn}>
          <Ionicons name="add" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export function CartScreen(_props: CartStackScreenProps) {
  const { colors } = useTheme();
  const { items, toggleItem, incrementQty, decrementQty, clearChecked, clearAll } = useCart();

  const grouped = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of items) {
      const key = item.category;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  function handleShare() {
    const lines = items.map((i) =>
      `${i.checked ? "✓" : "○"} ${i.name}${i.amount ? ` (${i.amount})` : ""}${i.qty > 1 ? ` ×${i.qty}` : ""}`,
    );
    const text = `Shopping List\n\n${lines.join("\n")}`;
    Alert.alert("Shopping List", text);
  }

  function handleClearAll() {
    Alert.alert("Clear cart", "Remove all items from your shopping cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear all", style: "destructive", onPress: clearAll },
    ]);
  }

  const bg = colors.background;
  const surface = colors.surface;
  const primary = colors.primary;
  const text = colors.text;
  const muted = colors.textMuted;
  const border = colors.border;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["bottom", "left", "right"]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border, backgroundColor: surface }]}>
        <View>
          <Text style={[styles.headerTitle, { color: text }]}>Shopping Cart</Text>
          <Text style={[styles.headerSub, { color: muted }]}>
            {totalCount > 0
              ? `${checkedCount}/${totalCount} items checked`
              : "No ingredients yet"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {items.length > 0 && (
            <Pressable
              onPress={handleShare}
              style={[styles.headerBtn, { backgroundColor: colors.surfaceMuted, borderColor: border }]}
            >
              <Ionicons name="share-outline" size={16} color={text} />
            </Pressable>
          )}
          {items.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={[styles.headerBtn, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          )}
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="cart-outline"
            title="Cart is empty"
            body="Open any recipe and tap Add to Cart to build your shopping list."
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={grouped}
          keyExtractor={([category]) => category}
          renderItem={({ item: [category, rows] }) => {
            const catColor = CATEGORY_COLORS[category] ?? "#888";
            const catIcon = CATEGORY_ICONS[category] ?? "ellipsis-horizontal";
            return (
              <View style={[styles.group, { backgroundColor: surface, borderColor: border }]}>
                {/* Category header */}
                <View style={styles.catHeader}>
                  <View style={[styles.catIconWrap, { backgroundColor: catColor + "22" }]}>
                    <Ionicons name={catIcon} size={14} color={catColor} />
                  </View>
                  <Text style={[styles.catTitle, { color: text }]}>{category}</Text>
                  <Text style={[styles.catCount, { color: muted }]}>{rows.length} item{rows.length > 1 ? "s" : ""}</Text>
                </View>
                {rows.map((row) => (
                  <IngredientRow
                    key={row.id}
                    item={row}
                    onToggle={() => toggleItem(row.id)}
                    onIncrement={() => incrementQty(row.id)}
                    onDecrement={() => decrementQty(row.id)}
                  />
                ))}
              </View>
            );
          }}
          ListFooterComponent={
            checkedCount > 0 ? (
              <Pressable
                onPress={clearChecked}
                style={[styles.clearBtn, { borderColor: primary, backgroundColor: primary + "14" }]}
              >
                <Ionicons name="checkmark-done" size={16} color={primary} />
                <Text style={[styles.clearBtnLabel, { color: primary }]}>
                  Remove {checkedCount} checked item{checkedCount > 1 ? "s" : ""}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  group: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  catIconWrap: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  catTitle: { flex: 1, fontSize: 14, fontWeight: "800" },
  catCount: { fontSize: 12 },
  ingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ingText: { flex: 1 },
  ingName: { fontSize: 14, fontWeight: "600" },
  strikethrough: { textDecorationLine: "line-through" },
  ingAmount: { fontSize: 12, marginTop: 1 },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNum: { fontSize: 13, fontWeight: "700", paddingHorizontal: 6, minWidth: 20, textAlign: "center" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  clearBtnLabel: { fontSize: 14, fontWeight: "700" },
});
