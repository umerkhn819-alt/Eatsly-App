import { apiFetchJson } from "./http";
import type { AiSuggestion, RecipePublic } from "./types";

export async function fetchRecommendations(input: {
  userNotes: string;
  wantCount?: number;
}): Promise<{
  suggestions: AiSuggestion[];
  model: string;
  catalogSampleSize: number;
}> {
  const res = await apiFetchJson<{
    ok: true;
    suggestions: AiSuggestion[];
    model: string;
    catalogSampleSize: number;
  }>("/ai/recommendations", {
    method: "POST",
    body: JSON.stringify({
      userNotes: input.userNotes,
      wantCount: input.wantCount ?? 5,
    }),
  });
  return {
    suggestions: res.suggestions,
    model: res.model,
    catalogSampleSize: res.catalogSampleSize,
  };
}

export async function sendChatMessage(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{ message: string; model: string }> {
  const res = await apiFetchJson<{
    ok: true;
    message: string;
    model: string;
  }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages: input.messages }),
  });
  return { message: res.message, model: res.model };
}

export async function fetchSpoonacularRecipe(
  spoonacularId: number,
): Promise<RecipePublic> {
  const res = await apiFetchJson<{ ok: true; recipe: RecipePublic }>(
    `/ai/spoonacular/recipes/${encodeURIComponent(String(spoonacularId))}`,
  );
  return res.recipe;
}

export async function fetchRandomSpoonacularRecipes(
  number?: number,
): Promise<RecipePublic[]> {
  const q =
    number != null && number >= 1 && number <= 20
      ? `?number=${encodeURIComponent(String(number))}`
      : "?number=12";
  const res = await apiFetchJson<{ ok: true; recipes: RecipePublic[] }>(
    `/ai/spoonacular/recipes/random${q}`,
  );
  return res.recipes;
}

export async function fetchPhotoRecipe(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<{ recipe: RecipePublic; model: string }> {
  const res = await apiFetchJson<{ ok: true; recipe: RecipePublic; model: string }>(
    "/ai/photo/recipe",
    {
      method: "POST",
      body: JSON.stringify({
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
      }),
    },
  );
  return { recipe: res.recipe, model: res.model };
}

export async function fetchAiPhotoRecipeById(id: string): Promise<RecipePublic> {
  const res = await apiFetchJson<{ ok: true; recipe: RecipePublic }>(
    `/ai/photo/recipes/${encodeURIComponent(id)}`,
  );
  return res.recipe;
}
