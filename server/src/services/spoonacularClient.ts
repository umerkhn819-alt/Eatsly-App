import type { RecipeIngredient, RecipePublic } from "../domain/recipe.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";

export type SpoonacularRecipe = {
  id: number;
  title: string;
  image: string | null;
  imageType: string | null;
};

type ComplexSearchResponse = {
  offset: number;
  number: number;
  totalResults: number;
  results: SpoonacularRecipe[];
};

function requireApiKey(): string {
  const key = env.SPOONACULAR_API_KEY;
  if (!key) {
    throw new HttpError(
      503,
      "Spoonacular is not configured on this server. Set SPOONACULAR_API_KEY.",
    );
  }
  return key;
}

function parseSearchPayload(payload: unknown): ComplexSearchResponse {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(502, "Spoonacular returned invalid response.");
  }
  const body = payload as Record<string, unknown>;
  const rawResults = body.results;
  if (!Array.isArray(rawResults)) {
    throw new HttpError(502, "Spoonacular response missing results.");
  }

  const results: SpoonacularRecipe[] = rawResults
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      if (typeof r.id !== "number" || typeof r.title !== "string") return null;
      const title = r.title.trim();
      if (title.length === 0) return null;
      return {
        id: r.id,
        title,
        image: typeof r.image === "string" && r.image.length > 0 ? r.image : null,
        imageType:
          typeof r.imageType === "string" && r.imageType.length > 0
            ? r.imageType
            : null,
      };
    })
    .filter((x): x is SpoonacularRecipe => x !== null);

  const offset =
    typeof body.offset === "number" && Number.isFinite(body.offset) ? body.offset : 0;
  const number =
    typeof body.number === "number" && Number.isFinite(body.number)
      ? body.number
      : results.length;
  const totalResults =
    typeof body.totalResults === "number" && Number.isFinite(body.totalResults)
      ? body.totalResults
      : results.length;

  return { offset, number, totalResults, results };
}

function spoonacularError(status: number, payload: unknown): HttpError {
  let message = "Spoonacular request failed.";
  if (payload && typeof payload === "object") {
    const maybe = (payload as Record<string, unknown>).message;
    if (typeof maybe === "string" && maybe.trim().length > 0) {
      message = maybe.trim();
    }
  }
  if (status === 401) {
    return new HttpError(502, "Spoonacular authentication failed. Check API key.");
  }
  if (status === 402) {
    return new HttpError(502, "Spoonacular quota exceeded. Upgrade or wait for reset.");
  }
  if (status === 429) {
    return new HttpError(502, "Spoonacular rate limit reached. Try again shortly.");
  }
  if (status >= 500) {
    return new HttpError(502, "Spoonacular service is temporarily unavailable.");
  }
  return new HttpError(502, message);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIngredientsFromInformation(raw: unknown): RecipeIngredient[] {
  if (!Array.isArray(raw)) return [];
  const out: RecipeIngredient[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const original = typeof r.original === "string" ? r.original.trim() : "";
    if (original.length > 0) {
      const name = original.length > 200 ? original.slice(0, 197) + "…" : original;
      out.push({ name });
      continue;
    }
    const namePart = typeof r.name === "string" ? r.name.trim() : "";
    if (namePart.length === 0) continue;
    const amount = r.amount;
    const unit = typeof r.unit === "string" ? r.unit.trim() : "";
    const amtStr =
      typeof amount === "number" && Number.isFinite(amount)
        ? String(amount)
        : typeof amount === "string"
          ? amount.trim()
          : "";
    const combined = [amtStr, unit, namePart].filter(Boolean).join(" ").trim();
    out.push({ name: combined });
  }
  return out;
}

function parseStepsFromInformation(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const steps: string[] = [];
  for (const block of raw) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    const stepList = b.steps;
    if (!Array.isArray(stepList)) continue;
    for (const s of stepList) {
      if (!s || typeof s !== "object") continue;
      const stepText = (s as Record<string, unknown>).step;
      if (typeof stepText === "string") {
        const t = stepText.replace(/<[^>]*>/g, "").trim();
        if (t.length > 0) steps.push(t);
      }
    }
  }
  return steps;
}

function parseTagsFromInformation(body: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const key of ["diets", "dishTypes", "cuisines"] as const) {
    const arr = body[key];
    if (!Array.isArray(arr)) continue;
    for (const v of arr) {
      if (typeof v === "string") {
        const s = v.trim().toLowerCase().replace(/\s+/g, "-");
        if (s.length > 0 && s.length <= 40) out.push(s);
      }
    }
  }
  return [...new Set(out)].slice(0, 20);
}

export function mapRecipeInformationToRecipePublic(
  payload: unknown,
  numericId: number,
): RecipePublic {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(502, "Spoonacular returned invalid recipe payload.");
  }
  const body = payload as Record<string, unknown>;
  const apiId = body.id;
  if (typeof apiId !== "number" || apiId !== numericId) {
    throw new HttpError(502, "Spoonacular recipe id mismatch.");
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length === 0) {
    throw new HttpError(502, "Spoonacular recipe missing title.");
  }
  const summary = typeof body.summary === "string" ? body.summary : "";
  const description = stripHtml(summary).slice(0, 20_000);
  const image = typeof body.image === "string" && body.image.length > 0 ? body.image : null;

  const ingredients = parseIngredientsFromInformation(body.extendedIngredients);
  let steps = parseStepsFromInformation(body.analyzedInstructions);
  if (steps.length === 0 && typeof body.instructions === "string" && body.instructions.trim()) {
    const plain = stripHtml(body.instructions);
    if (plain.length > 0) {
      steps = plain
        .split(/\n+|\.(?:\s+|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);
    }
  }
  if (steps.length === 0) {
    steps = [
      "Open this recipe on Spoonacular for full step-by-step instructions, or cook from the ingredient list.",
    ];
  }

  const prepMinutes =
    typeof body.preparationMinutes === "number" && Number.isFinite(body.preparationMinutes)
      ? Math.max(0, Math.trunc(body.preparationMinutes))
      : undefined;
  const cookMinutes =
    typeof body.cookingMinutes === "number" && Number.isFinite(body.cookingMinutes)
      ? Math.max(0, Math.trunc(body.cookingMinutes))
      : undefined;
  const servings =
    typeof body.servings === "number" && Number.isFinite(body.servings)
      ? Math.max(1, Math.trunc(body.servings))
      : undefined;

  let tags = parseTagsFromInformation(body);
  if (tags.length === 0) {
    tags = ["spoonacular"];
  }

  const now = new Date().toISOString();
  const recipe: RecipePublic = {
    id: `spoonacular:${numericId}`,
    ownerId: "external",
    title,
    description:
      description.length > 0 ? description : `Recipe from Spoonacular: ${title}.`,
    ingredients:
      ingredients.length > 0
        ? ingredients
        : [{ name: "Ingredient details unavailable; try refreshing or search again." }],
    steps,
    tags,
    prepMinutes,
    cookMinutes,
    servings,
    createdAt: now,
    updatedAt: now,
  };
  if (image) {
    recipe.imageUrl = image;
  }
  return recipe;
}

function parseRandomPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(502, "Spoonacular returned invalid response.");
  }
  const raw = (payload as Record<string, unknown>).recipes;
  if (!Array.isArray(raw)) {
    throw new HttpError(502, "Spoonacular response missing recipes.");
  }
  return raw;
}

/** Minimal card when full information mapping fails (rare). */
function mapSpoonacularSummaryToRecipePublic(
  body: Record<string, unknown>,
  numericId: number,
): RecipePublic {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length === 0) {
    throw new HttpError(502, "Spoonacular recipe missing title.");
  }
  const image =
    typeof body.image === "string" && body.image.length > 0 ? body.image : null;
  const ready =
    typeof body.readyInMinutes === "number" && Number.isFinite(body.readyInMinutes)
      ? Math.max(0, Math.trunc(body.readyInMinutes))
      : undefined;
  const servingsRaw = body.servings;
  const servings =
    typeof servingsRaw === "number" && Number.isFinite(servingsRaw)
      ? Math.max(1, Math.trunc(servingsRaw))
      : undefined;
  const now = new Date().toISOString();
  const recipe: RecipePublic = {
    id: `spoonacular:${numericId}`,
    ownerId: "external",
    title,
    description: `Recipe from Spoonacular: ${title}. Open for full details.`,
    ingredients: [{ name: "See full ingredient list on the recipe page." }],
    steps: ["Open this recipe for step-by-step instructions."],
    tags: ["spoonacular"],
    prepMinutes: 0,
    cookMinutes: ready,
    servings,
    createdAt: now,
    updatedAt: now,
  };
  if (image) {
    recipe.imageUrl = image;
  }
  return recipe;
}

/**
 * Fetch random recipes from Spoonacular for discovery feeds (e.g. home screen).
 * Uses the same information shape when the API returns full objects; otherwise falls back to a summary card.
 */
export async function getRandomRecipes(number: number): Promise<RecipePublic[]> {
  const n = Math.min(20, Math.max(1, Math.trunc(number)));
  const apiKey = requireApiKey();
  const url = new URL("/recipes/random", env.SPOONACULAR_BASE_URL);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("number", String(n));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SPOONACULAR_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      throw spoonacularError(res.status, payload);
    }
    const rawList = parseRandomPayload(payload);
    const out: RecipePublic[] = [];
    for (const raw of rawList) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const id = row.id;
      if (typeof id !== "number" || !Number.isInteger(id) || id < 1) continue;
      try {
        out.push(mapRecipeInformationToRecipePublic(raw, id));
      } catch {
        try {
          out.push(mapSpoonacularSummaryToRecipePublic(row, id));
        } catch {
          /* skip unreadable row */
        }
      }
    }
    return out;
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    console.error("Spoonacular random recipes failed:", err);
    throw new HttpError(502, "Spoonacular request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRecipeInformation(id: number): Promise<RecipePublic> {
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, "Invalid Spoonacular recipe id.");
  }
  const apiKey = requireApiKey();
  const url = new URL(`/recipes/${id}/information`, env.SPOONACULAR_BASE_URL);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("includeNutrition", "false");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SPOONACULAR_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      if (res.status === 404) {
        throw new HttpError(404, "Recipe not found on Spoonacular.");
      }
      throw spoonacularError(res.status, payload);
    }
    return mapRecipeInformationToRecipePublic(payload, id);
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    console.error("Spoonacular recipe information failed:", err);
    throw new HttpError(502, "Spoonacular request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchRecipes(input: {
  query: string;
  number: number;
  maxFat?: number;
}): Promise<ComplexSearchResponse> {
  const apiKey = requireApiKey();
  const query = input.query.trim();
  if (query.length === 0) {
    throw new HttpError(400, "Query must not be empty.");
  }
  if (input.number < 1 || input.number > 20) {
    throw new HttpError(400, "number must be between 1 and 20.");
  }

  const url = new URL("/recipes/complexSearch", env.SPOONACULAR_BASE_URL);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("number", String(input.number));
  if (typeof input.maxFat === "number" && Number.isFinite(input.maxFat)) {
    url.searchParams.set("maxFat", String(Math.max(0, Math.trunc(input.maxFat))));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SPOONACULAR_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      throw spoonacularError(res.status, payload);
    }
    return parseSearchPayload(payload);
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    console.error("Spoonacular request failed:", err);
    throw new HttpError(502, "Spoonacular request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
