import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as aiApi from "../api/aiApi";
import { seedRecipes } from "../data/seedRecipes";
import type { SearchTabScreenProps } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

const POPULAR = [
  { label: "Pizza margherita", emoji: "🍕" },
  { label: "Spicy ramen", emoji: "🍜" },
  { label: "Healthy salad", emoji: "🥗" },
  { label: "Grilled chicken", emoji: "🍗" },
  { label: "Chocolate cake", emoji: "🍰" },
  { label: "Beef stew", emoji: "🍲" },
];

const CATEGORIES = [
  { label: "Trending", icon: "flame" as const },
  { label: "High Protein", icon: "barbell" as const },
  { label: "Quick", icon: "flash" as const },
  { label: "Vegan", icon: "leaf" as const },
  { label: "Spicy", icon: "bonfire" as const },
  { label: "Dessert", icon: "ice-cream" as const },
  { label: "Breakfast", icon: "sunny" as const },
  { label: "Soup", icon: "water" as const },
];

type ResultItem = {
  id: string;
  title: string;
  reason: string;
  spoonacularId?: number;
  imageUrl?: string | null;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchSeedRecipeId(title: string): string | undefined {
  const needle = normalize(title);
  if (!needle) return undefined;
  const exact = seedRecipes.find((r) => normalize(r.title) === needle);
  if (exact) return exact.id;
  const partial = seedRecipes.find(
    (r) => normalize(r.title).includes(needle) || needle.includes(normalize(r.title)),
  );
  return partial?.id;
}

export function SearchScreen({ route, navigation }: SearchTabScreenProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(route.params?.query ?? "");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const initialQueryFired = useRef(false);

  // Auto-fire search when arriving with a query from HomeScreen Quick Picks
  useEffect(() => {
    const incoming = route.params?.query;
    if (incoming && !initialQueryFired.current) {
      initialQueryFired.current = true;
      setQuery(incoming);
      void doSearch(incoming);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.query]);

  const doSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setLoading(true);
      setSearched(true);
      try {
        const res = await aiApi.fetchRecommendations({ userNotes: trimmed, wantCount: 8 });
        setResults(
          res.suggestions.map((s, i) => ({
            id: `${i}-${s.title}`,
            title: s.title,
            reason: s.reason,
            spoonacularId: s.spoonacularId,
            imageUrl: s.imageUrl,
          })),
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handlePopular = (label: string) => {
    setQuery(label);
    void doSearch(label);
  };

  const handleCategory = (label: string) => {
    setActiveCategory(label);
    setQuery(label);
    void doSearch(label);
  };

  const handleResultPress = (item: ResultItem) => {
    if (typeof item.spoonacularId === "number") {
      navigation.navigate("Home", {
        screen: "RecipeDetail",
        params: { recipeId: `spoonacular:${item.spoonacularId}` },
      });
      return;
    }
    const seedId = matchSeedRecipeId(item.title);
    if (seedId) {
      navigation.navigate("Home", {
        screen: "RecipeDetail",
        params: { recipeId: seedId },
      });
      return;
    }
    navigation.navigate("Home", {
      screen: "RecipesList",
      params: { query: item.title },
    });
  };

  const bg = colors.background;
  const surface = colors.surface;
  const primary = colors.primary;
  const text = colors.text;
  const muted = colors.textMuted;
  const border = colors.border;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Heading */}
        <Text style={[styles.heading, { color: text }]}>
          Search{" "}
          <Text style={[styles.heading, { color: primary }]}>Tastie</Text>
        </Text>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: surface, borderColor: border }]}>
          <Ionicons name="search-outline" size={18} color={muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search recipes, ingredients, cuisines..."
            placeholderTextColor={muted}
            style={[styles.searchInput, { color: text }]}
            returnKeyType="search"
            onSubmitEditing={() => void doSearch(query)}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={muted} />
            </Pressable>
          )}
        </View>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={primary} size="large" />
          </View>
        )}

        {/* Results */}
        {!loading && searched && results.length > 0 && (
          <View style={styles.resultsWrap}>
            <Text style={[styles.sectionLabel, { color: muted }]}>RESULTS</Text>
            {results.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.resultCard, { backgroundColor: surface, borderColor: border }]}
                onPress={() => handleResultPress(item)}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.resultThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.resultIcon, { backgroundColor: primary + "22" }]}>
                    <Ionicons name="restaurant-outline" size={18} color={primary} />
                  </View>
                )}
                <View style={styles.resultText}>
                  <Text style={[styles.resultTitle, { color: text }]}>{item.title}</Text>
                  <Text style={[styles.resultSub, { color: muted }]} numberOfLines={2}>
                    {item.reason}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>
            ))}
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={32} color={muted} />
            <Text style={[styles.emptyText, { color: muted }]}>No recipes found</Text>
          </View>
        )}

        {/* Popular searches */}
        {!searched && (
          <>
            <Text style={[styles.sectionLabel, { color: muted }]}>POPULAR SEARCHES</Text>
            <View style={styles.popularGrid}>
              {POPULAR.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => handlePopular(item.label)}
                  style={[styles.popularCard, { backgroundColor: surface, borderColor: border }]}
                >
                  <Text style={styles.popularEmoji}>{item.emoji}</Text>
                  <Text style={[styles.popularLabel, { color: text }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Browse by category */}
        <Text style={[styles.sectionLabel, { color: muted }]}>BROWSE BY CATEGORY</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.label}
              onPress={() => handleCategory(cat.label)}
              style={[
                styles.categoryChip,
                { backgroundColor: surface, borderColor: activeCategory === cat.label ? primary : border },
              ]}
            >
              <View
                style={[
                  styles.categoryIconBox,
                  { backgroundColor: activeCategory === cat.label ? primary + "33" : colors.surfaceMuted },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={20}
                  color={activeCategory === cat.label ? primary : muted}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  { color: activeCategory === cat.label ? primary : text },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },
  heading: { fontSize: 28, fontWeight: "800", paddingHorizontal: spacing.lg, paddingTop: spacing.md, marginBottom: spacing.md },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15 },
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.md },
  popularGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: spacing.sm },
  popularCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    width: "47%",
    minHeight: 60,
  },
  popularEmoji: { fontSize: 24 },
  popularLabel: { fontSize: 14, fontWeight: "700", flex: 1 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: spacing.sm },
  categoryChip: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.sm,
    width: "22%",
    gap: 6,
  },
  categoryIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  categoryLabel: { fontSize: 10, fontWeight: "700", textAlign: "center" },
  resultsWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resultThumb: { width: 40, height: 40, borderRadius: 12 },
  resultText: { flex: 1 },
  resultTitle: { fontSize: 15, fontWeight: "700" },
  resultSub: { fontSize: 12, marginTop: 2 },
  emptyWrap: { paddingVertical: 40, alignItems: "center", gap: spacing.sm },
  emptyText: { fontSize: 15, fontWeight: "600" },
});
