import { apiFetchJson, apiFetchVoid } from "./http";
import type { RecipePublic } from "./types";

export async function listRecipes(input: {
  mine: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ recipes: RecipePublic[]; total: number }> {
  const q = new URLSearchParams();
  if (input.mine) {
    q.set("mine", "1");
  }
  if (input.limit !== undefined) {
    q.set("limit", String(input.limit));
  }
  if (input.offset !== undefined) {
    q.set("offset", String(input.offset));
  }
  const qs = q.toString();
  const path = qs.length > 0 ? `/recipes?${qs}` : "/recipes";
  const res = await apiFetchJson<{
    ok: true;
    recipes: RecipePublic[];
    total: number;
  }>(path);
  return { recipes: res.recipes, total: res.total };
}

export async function getRecipe(id: string): Promise<RecipePublic> {
  const res = await apiFetchJson<{ ok: true; recipe: RecipePublic }>(
    `/recipes/${encodeURIComponent(id)}`,
  );
  return res.recipe;
}

export async function createRecipe(input: {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount?: string }>;
  steps: string[];
  tags?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
}): Promise<RecipePublic> {
  const res = await apiFetchJson<{ ok: true; recipe: RecipePublic }>("/recipes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiFetchVoid(`/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
