import type { ObjectId } from "mongodb";

export const RECIPES_COLLECTION = "recipes";

export type RecipeIngredient = {
  name: string;
  amount?: string;
};

export type RecipeDocument = {
  _id: ObjectId;
  ownerId: ObjectId;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type RecipePublic = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  /** Present for Spoonacular-backed recipes returned by the API */
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};
