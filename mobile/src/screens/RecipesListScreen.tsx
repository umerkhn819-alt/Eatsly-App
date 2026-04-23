import type { RecipesListScreenProps } from "../navigation/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RecipePublic } from "../api/types";
import type { AiSuggestion } from "../api/types";
import { ApiError } from "../api/http";
import * as aiApi from "../api/aiApi";
import * as recipesApi from "../api/recipesApi";
import { useAuth } from "../auth/AuthContext";
import { EmptyState } from "../components/EmptyState";
import { FormErrorText } from "../components/FormErrorText";
import { Skeleton } from "../components/Skeleton";
import { seedRecipes, getRecipeImage } from "../data/seedRecipes";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

const PAGE = 25;

const TAG_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  quick: "flash",
  protein: "barbell",
  spicy: "flame",
  healthy: "leaf",
  budget: "cash",
  breakfast: "sunny",
  vegan: "leaf",
  comfort: "home",
  vegetarian: "flower",
  dinner: "restaurant",
  salad: "nutrition",
};

export function RecipesListScreen({ navigation }: RecipesListScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [mineOnly, setMineOnly] = useState(false);
  const [items, setItems] = useState<RecipePublic[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { recipes, total: t } = await recipesApi.listRecipes({ mine: mineOnly, limit: PAGE, offset: 0 });
      setItems(recipes);
      setTotal(t);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load recipes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mineOnly]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);
  const onRefresh = useCallback(() => { setRefreshing(true); void loadFirst(); }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || items.length >= total) return;
    setLoadingMore(true);
    try {
      const { recipes, total: t } = await recipesApi.listRecipes({ mine: mineOnly, limit: PAGE, offset: items.length });
      setItems((prev) => [...prev, ...recipes]);
      setTotal(t);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, loading, loadingMore, mineOnly, total]);

  const confirmDeleteRecipe = useCallback(
    (item: RecipePublic) => {
      if (!user || item.ownerId !== user.id) return;
      Alert.alert(
        "Delete recipe",
        `Remove "${item.title}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await recipesApi.deleteRecipe(item.id);
                  await loadFirst();
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : "Could not delete recipe");
                }
              })();
            },
          },
        ],
      );
    },
    [user, loadFirst],
  );

  async function handleTagPress(tag: string) {
    setSelectedTag(tag);
    if (tag !== "all") {
      setAiLoading(true);
      try {
        const res = await aiApi.fetchRecommendations({ userNotes: tag, wantCount: 4 });
        setAiSuggestions(res.suggestions);
      } catch {
        setAiSuggestions([]);
      } finally {
        setAiLoading(false);
      }
    } else {
      setAiSuggestions([]);
    }
  }

  const activeItems = items.length > 0 ? items : seedRecipes;
  const tags = ["all", ...new Set(activeItems.flatMap((r) => r.tags))].slice(0, 10);
  const filtered = selectedTag === "all" ? activeItems : activeItems.filter((r) => r.tags.includes(selectedTag));
  const quickMeals = activeItems.filter((r) => (r.prepMinutes ?? 99) + (r.cookMinutes ?? 99) <= 35);

  const bg = colors.background;
  const surface = colors.surface;
  const primary = colors.primary;
  const text = colors.text;
  const muted = colors.textMuted;
  const border = colors.border;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["bottom", "left", "right"]}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: surface, borderBottomColor: border }]}>
        <Pressable
          onPress={() => setMineOnly((v) => !v)}
          style={[
            styles.toggleChip,
            {
              backgroundColor: mineOnly ? primary : colors.surfaceMuted,
              borderColor: mineOnly ? primary : border,
            },
          ]}
        >
          <Ionicons name="person-outline" size={14} color={mineOnly ? "#fff" : muted} />
          <Text style={[styles.toggleLabel, { color: mineOnly ? "#fff" : text }]}>Mine only</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("RecipeCreate")}
          style={[styles.createBtn, { backgroundColor: primary }]}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.createBtnText}>New</Text>
        </Pressable>
      </View>

      <FormErrorText message={error} />

      {loading && items.length === 0 ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={140} borderRadius={18} />
          <Skeleton height={80} borderRadius={18} />
          <Skeleton height={80} borderRadius={18} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.3}
          onEndReached={() => void loadMore()}
          ListHeaderComponent={
            <View style={styles.header}>
              {/* Featured horizontal scroll */}
              <Text style={[styles.sectionLabel, { color: muted }]}>FEATURED RECIPES</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={activeItems.slice(0, 6)}
                keyExtractor={(r) => `feat-${r.id}`}
                contentContainerStyle={styles.featuredRow}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.featCard, { backgroundColor: surface, borderColor: border }]}
                    onPress={() => navigation.navigate("RecipeDetail", { recipeId: item.id })}
                  >
                    <Image source={{ uri: getRecipeImage(item) }} style={styles.featImage} resizeMode="cover" />
                    <View style={styles.featBottom}>
                      <Text style={[styles.featTitle, { color: text }]} numberOfLines={2}>{item.title}</Text>
                      <Text style={[styles.featMeta, { color: muted }]}>
                        ⏱ {(item.prepMinutes ?? 0) + (item.cookMinutes ?? 0)} min
                      </Text>
                    </View>
                  </Pressable>
                )}
              />

              {/* Category chips */}
              <Text style={[styles.sectionLabel, { color: muted }]}>BROWSE CATEGORIES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {tags.map((tag) => {
                  const sel = tag === selectedTag;
                  const icon = TAG_ICONS[tag] ?? "pricetag";
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => void handleTagPress(tag)}
                      style={[
                        styles.tagChip,
                        { backgroundColor: sel ? primary : surface, borderColor: sel ? primary : border },
                      ]}
                    >
                      <Ionicons name={icon} size={13} color={sel ? "#fff" : muted} />
                      <Text style={[styles.tagLabel, { color: sel ? "#fff" : text }]}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* AI suggestions for selected tag */}
              {aiLoading && (
                <View style={styles.aiRow}>
                  <ActivityIndicator color={primary} />
                  <Text style={[styles.aiLoadingText, { color: muted }]}>Finding AI picks…</Text>
                </View>
              )}
              {!aiLoading && aiSuggestions.length > 0 && (
                <View style={styles.aiBlock}>
                  <Text style={[styles.sectionLabel, { color: muted }]}>AI PICKS FOR "{selectedTag.toUpperCase()}"</Text>
                  {aiSuggestions.map((s, i) => (
                    <Pressable
                      key={`ai-${i}`}
                      style={[styles.aiCard, { backgroundColor: surface, borderColor: border }]}
                      onPress={() => {
                        if (typeof s.spoonacularId === "number") {
                          navigation.navigate("RecipeDetail", {
                            recipeId: `spoonacular:${s.spoonacularId}`,
                          });
                          return;
                        }
                        navigation.getParent()?.navigate("Search", { query: s.title });
                      }}
                    >
                      <View style={[styles.aiIcon, { backgroundColor: primary + "22" }]}>
                        <Ionicons name="sparkles" size={14} color={primary} />
                      </View>
                      <View style={styles.aiText}>
                        <Text style={[styles.aiTitle, { color: text }]}>{s.title}</Text>
                        <Text style={[styles.aiReason, { color: muted }]} numberOfLines={1}>{s.reason}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={muted} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Quick meals */}
              {quickMeals.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: muted }]}>QUICK MEALS (UNDER 35 MIN)</Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={quickMeals.slice(0, 8)}
                    keyExtractor={(r) => `qm-${r.id}`}
                    contentContainerStyle={styles.quickRow}
                    renderItem={({ item }) => (
                      <Pressable
                        style={[styles.quickCard, { backgroundColor: surface, borderColor: border }]}
                        onPress={() => navigation.navigate("RecipeDetail", { recipeId: item.id })}
                      >
                        <Text style={[styles.quickTitle, { color: text }]} numberOfLines={2}>{item.title}</Text>
                        <Text style={[styles.quickMeta, { color: primary }]}>
                          ⏱ {(item.prepMinutes ?? 0) + (item.cookMinutes ?? 0)} min
                        </Text>
                      </Pressable>
                    )}
                  />
                </>
              )}

              <Text style={[styles.sectionLabel, { color: muted }]}>
                {selectedTag === "all" ? "ALL RECIPES" : `RECIPES — ${selectedTag.toUpperCase()}`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[styles.recipeRow, { backgroundColor: surface, borderBottomColor: border }]}
            >
              <Pressable
                style={styles.recipeRowMain}
                onPress={() => navigation.navigate("RecipeDetail", { recipeId: item.id })}
              >
                <Image source={{ uri: getRecipeImage(item) }} style={styles.rowThumb} resizeMode="cover" />
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: text }]} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.rowMeta}>
                    {item.tags.slice(0, 2).map((t) => (
                      <View key={t} style={[styles.rowTag, { backgroundColor: primary + "18" }]}>
                        <Text style={[styles.rowTagText, { color: primary }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.rowTime, { color: muted }]}>
                    ⏱ {(item.prepMinutes ?? 0) + (item.cookMinutes ?? 0)} min · {item.servings ?? "?"} servings
                  </Text>
                </View>
              </Pressable>
              {user && item.ownerId === user.id ? (
                <Pressable
                  onPress={() => confirmDeleteRecipe(item)}
                  style={styles.rowDeleteBtn}
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={20} color="#DC3545" />
                </Pressable>
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={muted} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState title="No recipes" body="Try a different filter or create one." />
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  toggleLabel: { fontSize: 13, fontWeight: "700" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  skeletonWrap: { padding: spacing.lg, gap: spacing.md },
  header: { paddingTop: spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  featuredRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  featCard: { width: 160, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  featImage: { width: "100%", height: 100 },
  featBottom: { padding: spacing.sm },
  featTitle: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  featMeta: { fontSize: 11, marginTop: 3 },
  chipsRow: { paddingHorizontal: spacing.lg, gap: 8, paddingRight: spacing.lg + 8 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagLabel: { fontSize: 12, fontWeight: "700" },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  aiLoadingText: { fontSize: 13 },
  aiBlock: { paddingHorizontal: spacing.lg, gap: 8 },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiText: { flex: 1 },
  aiTitle: { fontSize: 13, fontWeight: "700" },
  aiReason: { fontSize: 11, marginTop: 1 },
  quickRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  quickCard: { width: 170, borderRadius: 14, borderWidth: 1, padding: spacing.md },
  quickTitle: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  quickMeta: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recipeRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowDeleteBtn: { padding: 4 },
  rowThumb: { width: 64, height: 64, borderRadius: 12 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "700", lineHeight: 19 },
  rowMeta: { flexDirection: "row", gap: 6, marginTop: 4 },
  rowTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rowTagText: { fontSize: 11, fontWeight: "700" },
  rowTime: { fontSize: 12, marginTop: 4 },
  emptyWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  footer: { paddingVertical: spacing.md, alignItems: "center" },
});
