import { ObjectId } from "mongodb";
import { HttpError } from "../middleware/errorHandler.js";
import * as favoritesRepo from "../repos/favoritesRepo.js";
import * as recipesRepo from "../repos/recipesRepo.js";
import { toPublicRecipe } from "./recipesService.js";
import type { RecipePublic } from "../domain/recipe.js";

export function parseFavoriteListQuery(query: Record<string, unknown>): {
  limit: number;
  offset: number;
} {
  const limitRaw = typeof query.limit === "string" ? query.limit : undefined;
  const offsetRaw = typeof query.offset === "string" ? query.offset : undefined;

  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
  const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;

  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, "limit must be between 1 and 100");
  }
  if (!Number.isFinite(offset) || offset < 0 || offset > 1_000_000) {
    throw new HttpError(400, "offset must be between 0 and 1000000");
  }

  return { limit, offset };
}

function parseRecipeId(value: unknown): ObjectId {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "recipeId is required");
  }
  const id = value.trim();
  if (!ObjectId.isValid(id)) {
    throw new HttpError(400, "recipeId is invalid");
  }
  return new ObjectId(id);
}

export async function addFavorite(input: {
  userId: string;
  body: unknown;
}): Promise<{ recipe: RecipePublic; alreadyFavorited: boolean }> {
  if (!input.body || typeof input.body !== "object") {
    throw new HttpError(400, "JSON body is required");
  }
  const body = input.body as Record<string, unknown>;
  const recipeId = parseRecipeId(body.recipeId);

  const recipe = await recipesRepo.findRecipeById(recipeId.toHexString());
  if (!recipe) {
    throw new HttpError(404, "Recipe not found");
  }

  const userId = new ObjectId(input.userId);
  const result = await favoritesRepo.insertFavorite({ userId, recipeId });

  return {
    recipe: toPublicRecipe(recipe),
    alreadyFavorited: !result.created,
  };
}

export async function removeFavorite(input: {
  userId: string;
  recipeIdParam: string;
}): Promise<void> {
  if (!ObjectId.isValid(input.recipeIdParam)) {
    throw new HttpError(400, "Invalid recipe id");
  }

  const userId = new ObjectId(input.userId);
  const recipeId = new ObjectId(input.recipeIdParam);

  const ok = await favoritesRepo.deleteFavorite({ userId, recipeId });
  if (!ok) {
    throw new HttpError(404, "Favorite not found");
  }
}

export async function listFavorites(input: {
  userId: string;
  limit: number;
  offset: number;
}): Promise<{ recipes: RecipePublic[]; total: number }> {
  const userId = new ObjectId(input.userId);
  const { items, total } = await favoritesRepo.listFavoritesPage({
    userId,
    limit: input.limit,
    offset: input.offset,
  });

  if (items.length === 0) {
    return { recipes: [], total };
  }

  const ids = items.map((i) => i.recipeId);
  const docs = await recipesRepo.findRecipesByIds(ids);
  const byHex = new Map(docs.map((d) => [d._id.toHexString(), d]));

  const recipes = items
    .map((row) => byHex.get(row.recipeId.toHexString()))
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .map(toPublicRecipe);

  return { recipes, total };
}
