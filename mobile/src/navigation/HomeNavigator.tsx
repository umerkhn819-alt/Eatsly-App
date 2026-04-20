import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { CartScreen } from "../screens/CartScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { RecipeCreateScreen } from "../screens/RecipeCreateScreen";
import { RecipeDetailScreen } from "../screens/RecipeDetailScreen";
import { RecipesListScreen } from "../screens/RecipesListScreen";
import { useTheme } from "../theme/ThemeContext";
import type { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ headerShown: true, title: "Recipe" }}
      />
      <Stack.Screen
        name="RecipeCreate"
        component={RecipeCreateScreen}
        options={{ headerShown: true, title: "Create recipe" }}
      />
      <Stack.Screen
        name="RecipesList"
        component={RecipesListScreen}
        options={{ headerShown: true, title: "All Recipes" }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ headerShown: true, title: "Favorites" }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ headerShown: true, title: "Shopping Cart" }}
      />
    </Stack.Navigator>
  );
}
