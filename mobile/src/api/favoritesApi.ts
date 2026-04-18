import { apiFetchJson, apiFetchVoid } from "./http";
import type { RecipePublic } from "./types";

export async function listFavorites(input?: {
  limit?: number;
  offset?: number;
}): Promise<{ recipes: RecipePublic[]; total: number }> {
  const q = new URLSearchParams();
  q.set("limit", String(input?.limit ?? 50));
  q.set("offset", String(input?.offset ?? 0));
  const res = await apiFetchJson<{
    ok: true;
    recipes: RecipePublic[];
    total: number;
  }>(`/favorites?${q.toString()}`);
  return { recipes: res.recipes, total: res.total };
}

export async function addFavorite(recipeId: string): Promise<{
  recipe: RecipePublic;
  alreadyFavorited: boolean;
}> {
  const res = await apiFetchJson<{
    ok: true;
    recipe: RecipePublic;
    alreadyFavorited: boolean;
  }>("/favorites", {
    method: "POST",
    body: JSON.stringify({ recipeId }),
  });
  return { recipe: res.recipe, alreadyFavorited: res.alreadyFavorited };
}

export async function removeFavorite(recipeId: string): Promise<void> {
  await apiFetchVoid(`/favorites/${encodeURIComponent(recipeId)}`, {
    method: "DELETE",
  });
}
