import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RecipePublic } from "../api/types";
import { ApiError } from "../api/http";
import * as favoritesApi from "../api/favoritesApi";
import { RecipeRow } from "../components/RecipeRow";
import { FormErrorText } from "../components/FormErrorText";
import type { FavoritesStackScreenProps } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function FavoritesScreen({ navigation }: FavoritesStackScreenProps) {
  const [items, setItems] = useState<RecipePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { recipes } = await favoritesApi.listFavorites({ limit: 100, offset: 0 });
      setItems(recipes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load favorites");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  function openRecipe(recipeId: string) {
    navigation.navigate("RecipeDetail", { recipeId });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>Favorites</Text>
        <Text style={styles.headSub}>Recipes you have saved</Text>
      </View>

      <FormErrorText message={error} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeRow recipe={item} onPress={() => openRecipe(item.id)} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No favorites yet. Open a recipe and tap the heart.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  head: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  headSub: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textMuted,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.textMuted,
  },
});
