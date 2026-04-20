import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { RecipeCreateScreen } from "../screens/RecipeCreateScreen";
import { RecipeDetailScreen } from "../screens/RecipeDetailScreen";
import { RecipesListScreen } from "../screens/RecipesListScreen";
import { useTheme } from "../theme/ThemeContext";
import type { RecipesStackParamList } from "./types";

const Stack = createNativeStackNavigator<RecipesStackParamList>();

export function RecipesNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="RecipesList"
        component={RecipesListScreen}
        options={{ title: "Recipes" }}
      />
      <Stack.Screen
        name="RecipeCreate"
        component={RecipeCreateScreen}
        options={{ title: "Create recipe" }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: "Recipe" }}
      />
    </Stack.Navigator>
  );
}
