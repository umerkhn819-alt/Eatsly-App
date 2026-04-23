import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../api/http";
import * as aiApi from "../api/aiApi";
import * as favoritesApi from "../api/favoritesApi";
import * as recipesApi from "../api/recipesApi";
import type { RecipePublic } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { FormErrorText } from "../components/FormErrorText";
import { getRecipeImage, seedRecipes } from "../data/seedRecipes";
import type { RecipeDetailScreenProps } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

function isSeedRecipe(id: string): boolean {
  return id.startsWith("seed-");
}

function isSpoonacularRecipe(id: string): boolean {
  return id.startsWith("spoonacular:");
}

function isAiPhotoRecipe(id: string): boolean {
  return id.startsWith("ai-photo:");
}

function spoonacularNumericId(id: string): number | null {
  if (!isSpoonacularRecipe(id)) return null;
  const n = Number(id.slice("spoonacular:".length));
  return Number.isFinite(n) ? n : null;
}

function getSeedRecipe(id: string): RecipePublic | null {
  return seedRecipes.find((r) => r.id === id) ?? null;
}

function TimeChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <Ionicons name={icon} size={13} color={colors.primary} />
      <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

export function RecipeDetailScreen({ route, navigation }: RecipeDetailScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { addItemsFromRecipe } = useCart();
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<RecipePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favBusy, setFavBusy] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const cartAnim = useRef(new Animated.Value(1)).current;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (isSeedRecipe(recipeId)) {
      const seed = getSeedRecipe(recipeId);
      if (seed) {
        setRecipe(seed);
        navigation.setOptions({ title: seed.title });
      } else {
        setError("Recipe not found");
      }
      setLoading(false);
      return;
    }
    const spoonId = spoonacularNumericId(recipeId);
    if (spoonId != null) {
      try {
        const r = await aiApi.fetchSpoonacularRecipe(spoonId);
        setRecipe(r);
        navigation.setOptions({ title: r.title });
        setIsFavorite(false);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load recipe");
        setRecipe(null);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (isAiPhotoRecipe(recipeId)) {
      try {
        const r = await aiApi.fetchAiPhotoRecipeById(recipeId);
        setRecipe(r);
        navigation.setOptions({ title: r.title });
        setIsFavorite(false);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load recipe");
        setRecipe(null);
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const r = await recipesApi.getRecipe(recipeId);
      setRecipe(r);
      navigation.setOptions({ title: r.title });
      // Load favorites separately so a favorites error never blocks the recipe
      favoritesApi.listFavorites({ limit: 100, offset: 0 })
        .then((favs) => setIsFavorite(favs.recipes.some((x) => x.id === recipeId)))
        .catch(() => { /* favorites unavailable – silently ignore */ });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load recipe");
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [navigation, recipeId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const isRecipeOwner = Boolean(
    recipe &&
      user &&
      recipe.ownerId === user.id &&
      !isSeedRecipe(recipeId) &&
      !isSpoonacularRecipe(recipeId) &&
      !isAiPhotoRecipe(recipeId),
  );

  const confirmDelete = useCallback(() => {
    if (!recipe) return;
    Alert.alert(
      "Delete recipe",
      `Remove "${recipe.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await recipesApi.deleteRecipe(recipe.id);
                navigation.goBack();
              } catch (e) {
                setError(e instanceof ApiError ? e.message : "Could not delete recipe");
              }
            })();
          },
        },
      ],
    );
  }, [recipe, navigation]);

  useLayoutEffect(() => {
    if (!isRecipeOwner) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={confirmDelete} hitSlop={12} style={{ marginRight: 4 }}>
          <Ionicons name="trash-outline" size={22} color="#DC3545" />
        </Pressable>
      ),
    });
  }, [navigation, isRecipeOwner, confirmDelete]);

  async function toggleFavorite() {
    if (
      !recipe ||
      favBusy ||
      isSeedRecipe(recipeId) ||
      isSpoonacularRecipe(recipeId) ||
      isAiPhotoRecipe(recipeId)
    ) return;
    setFavBusy(true);
    try {
      if (isFavorite) {
        await favoritesApi.removeFavorite(recipe.id);
        setIsFavorite(false);
      } else {
        await favoritesApi.addFavorite(recipe.id);
        setIsFavorite(true);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update favorite");
    } finally {
      setFavBusy(false);
    }
  }

  function handleAddToCart() {
    if (!recipe) return;
    addItemsFromRecipe(recipe.title, recipe.ingredients);
    setCartAdded(true);
    Animated.sequence([
      Animated.timing(cartAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(cartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setCartAdded(false), 2500);
  }

  const bg = colors.background;
  const surface = colors.surface;
  const primary = colors.primary;
  const text = colors.text;
  const muted = colors.textMuted;
  const border = colors.border;

  if (loading && !recipe) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["bottom", "left", "right"]}>
        <FormErrorText message={error ?? "Recipe not found"} />
      </SafeAreaView>
    );
  }

  const heroImage = getRecipeImage(recipe);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          <Pressable
            onPress={() => void toggleFavorite()}
            disabled={
              favBusy ||
              isSeedRecipe(recipeId) ||
              isSpoonacularRecipe(recipeId) ||
              isAiPhotoRecipe(recipeId)
            }
            style={[styles.favBtn, { backgroundColor: surface }]}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#FF4D6D" : muted}
            />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <FormErrorText message={error} />

          {/* Title */}
          <Text style={[styles.title, { color: text }]}>{recipe.title}</Text>

          {/* Tags row */}
          {recipe.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {recipe.tags.map((tag) => (
                <View key={tag} style={[styles.tagChip, { backgroundColor: primary + "22", borderColor: primary + "44" }]}>
                  <Text style={[styles.tagText, { color: primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Meta chips */}
          <View style={styles.metaRow}>
            {recipe.prepMinutes != null && (
              <TimeChip icon="time-outline" label={`Prep ${recipe.prepMinutes}m`} />
            )}
            {recipe.cookMinutes != null && (
              <TimeChip icon="flame-outline" label={`Cook ${recipe.cookMinutes}m`} />
            )}
            {recipe.servings != null && (
              <TimeChip icon="people-outline" label={`Serves ${recipe.servings}`} />
            )}
          </View>

          {/* Description */}
          {recipe.description.length > 0 && (
            <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>About</Text>
              <Text style={[styles.descText, { color: muted }]}>{recipe.description}</Text>
            </View>
          )}

          {/* Ingredients */}
          <View style={[styles.section, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: text }]}>Ingredients</Text>
              <Text style={[styles.sectionCount, { color: muted }]}>{recipe.ingredients.length} items</Text>
            </View>
            {recipe.ingredients.map((ing, idx) => (
              <View
                key={idx}
                style={[
                  styles.ingRow,
                  idx < recipe.ingredients.length - 1 && { borderBottomWidth: 1, borderBottomColor: border },
                ]}
              >
                <View style={[styles.ingIconWrap, { backgroundColor: primary + "18" }]}>
                  <Ionicons name="nutrition-outline" size={15} color={primary} />
                </View>
                <Text style={[styles.ingName, { color: text }]}>{ing.name}</Text>
                {ing.amount ? (
                  <View style={[styles.amountBadge, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[styles.amountText, { color: muted }]}>{ing.amount}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {/* Add to Cart button */}
          <Animated.View style={{ transform: [{ scale: cartAnim }] }}>
            <Pressable
              onPress={handleAddToCart}
              style={[
                styles.cartBtn,
                { backgroundColor: cartAdded ? "#2DC653" : primary },
              ]}
            >
              <Ionicons
                name={cartAdded ? "checkmark-circle" : "cart"}
                size={18}
                color="#fff"
              />
              <Text style={styles.cartBtnLabel}>
                {cartAdded ? "Added to Cart!" : "Add to Cart"}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Steps */}
          <View style={styles.stepsBlock}>
            <Text style={[styles.sectionTitle, { color: text }]}>Instructions</Text>
            {recipe.steps.map((step, idx) => (
              <View key={idx} style={[styles.stepCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={[styles.stepNum, { backgroundColor: primary }]}>
                  <Text style={styles.stepNumText}>{idx + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: text }]}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroWrap: { height: 220, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  favBtn: {
    position: "absolute",
    bottom: 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: "800", lineHeight: 30 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionCount: { fontSize: 12 },
  descText: { fontSize: 14, lineHeight: 22 },
  ingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: spacing.sm,
  },
  ingIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ingName: { flex: 1, fontSize: 14, fontWeight: "600" },
  amountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  amountText: { fontSize: 12, fontWeight: "600" },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cartBtnLabel: { color: "#fff", fontSize: 15, fontWeight: "800" },
  stepsBlock: { gap: spacing.sm },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 22, paddingTop: 4 },
});
