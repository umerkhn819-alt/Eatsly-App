import { HttpError } from "../middleware/errorHandler.js";
import * as recipesRepo from "../repos/recipesRepo.js";
import { searchRecipes } from "./spoonacularClient.js";

export type RecommendationItem = {
  title: string;
  reason: string;
  matchesCatalogRecipeTitle: string | null;
  source: "spoonacular";
  spoonacularId: number;
  imageUrl: string | null;
};

function clampWantCount(raw: unknown): number {
  if (raw === undefined || raw === null) {
    return 5;
  }
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new HttpError(400, "wantCount must be a number");
  }
  const n = Math.trunc(raw);
  if (n < 1 || n > 10) {
    throw new HttpError(400, "wantCount must be between 1 and 10");
  }
  return n;
}

function parseUserNotes(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "";
  }
  const b = body as Record<string, unknown>;
  const raw = b.userNotes ?? b.context;
  if (raw === undefined || raw === null) {
    return "";
  }
  if (typeof raw !== "string") {
    throw new HttpError(400, "userNotes must be a string");
  }
  const s = raw.trim();
  if (s.length > 4_000) {
    throw new HttpError(400, "userNotes is too long");
  }
  return s;
}

function parseWantCount(body: unknown): number {
  if (!body || typeof body !== "object") {
    return 5;
  }
  const b = body as Record<string, unknown>;
  return clampWantCount(b.wantCount);
}

function parseMaxFat(userNotes: string): number | undefined {
  const m = userNotes.match(/\bmax\s*fat\s*[:=]?\s*(\d{1,3})\b/i);
  if (!m) return undefined;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export async function generateRecommendations(body: unknown): Promise<{
  suggestions: RecommendationItem[];
  model: string;
  catalogSampleSize: number;
}> {
  const wantCount = parseWantCount(body);
  const userNotes = parseUserNotes(body);
  const catalogTitles = await recipesRepo.findRecentRecipeTitles(40);
  const query = userNotes.length > 0 ? userNotes : "easy dinner";
  const maxFat = parseMaxFat(userNotes);

  let model = "spoonacular:complexSearch";
  let suggestions: RecommendationItem[];
  try {
    const res = await searchRecipes({
      query,
      number: wantCount,
      maxFat,
    });
    const normalizedCatalog = new Map(
      catalogTitles.map((title) => [title.trim().toLowerCase(), title]),
    );
    suggestions = res.results.map((row) => {
      const matched = normalizedCatalog.get(row.title.trim().toLowerCase()) ?? null;
      const reasonBits = [`Found via Spoonacular for "${query}"`];
      if (typeof maxFat === "number") {
        reasonBits.push(`maxFat ${maxFat}`);
      }
      return {
        title: row.title,
        reason: reasonBits.join(" · "),
        matchesCatalogRecipeTitle: matched,
        source: "spoonacular",
        spoonacularId: row.id,
        imageUrl: row.image,
      };
    });
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    console.error("Spoonacular recommendations request failed:", err);
    throw new HttpError(502, "Recipe search failed. Try again later.");
  }

  if (!suggestions || suggestions.length === 0) {
    throw new HttpError(404, "No recipe suggestions found for this query.");
  }
  return {
    suggestions: suggestions.slice(0, wantCount),
    model,
    catalogSampleSize: catalogTitles.length,
  };
}
