import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  RecipeCreate: undefined;
  RecipeDetail: { recipeId: string };
  RecipesList: { query?: string } | undefined;
  Favorites: undefined;
  Cart: undefined;
};

// Keep for backward compat with existing screens
export type RecipesStackParamList = HomeStackParamList;

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Search: { query?: string } | undefined;
  Automate: undefined;
  Reports: undefined;
  Profile: undefined;
};

export type HomeMainScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "HomeMain"
>;
export type RecipesListScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "RecipesList"
>;
export type RecipeDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "RecipeDetail"
>;
export type FavoritesStackScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "Favorites"
>;
export type CartStackScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "Cart"
>;
export type ProfileTabScreenProps = BottomTabScreenProps<
  MainTabParamList,
  "Profile"
>;
export type SearchTabScreenProps = BottomTabScreenProps<
  MainTabParamList,
  "Search"
>;
export type AutomationTabScreenProps = BottomTabScreenProps<
  MainTabParamList,
  "Automate"
>;
export type ReportsTabScreenProps = BottomTabScreenProps<
  MainTabParamList,
  "Reports"
>;
// kept for backward compat
export type AiHubScreenProps = BottomTabScreenProps<MainTabParamList, "Search">;
export type CartTabScreenProps = BottomTabScreenProps<MainTabParamList, "Search">;
export type FavoritesTabScreenProps = BottomTabScreenProps<MainTabParamList, "Search">;
