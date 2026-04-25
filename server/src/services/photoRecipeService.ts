import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import type { RecipePublic } from "../domain/recipe.js";
import { HttpError } from "../middleware/errorHandler.js";
import { getRandomRecipes, getRecipeInformation, searchRecipes } from "./spoonacularClient.js";

const MAX_BASE64_LEN = 4_200_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

type CreatedRecipe = {
  recipe: RecipePublic;
  model: string;
};

type CachedPhotoRecipe = {
  recipe: RecipePublic;
  expiresAt: number;
};

const cache = new Map<string, CachedPhotoRecipe>();

function cleanupCache(now: number): void {
  for (const [id, row] of cache.entries()) {
    if (row.expiresAt <= now) {
      cache.delete(id);
    }
  }
}

function parseIncomingImage(
  body: unknown,
): { dataUrl?: string; imageUrl?: string; mimeType: string } {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "JSON body is required.");
  }
  const b = body as Record<string, unknown>;
  const rawImage = b.imageBase64;
  const rawMime = b.mimeType;
  const rawUrl = b.imageUrl;

  if (typeof rawUrl === "string" && rawUrl.trim().length > 0) {
    const url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new HttpError(400, "imageUrl must be an absolute HTTP URL.");
    }
    return { imageUrl: url, mimeType: "image/jpeg" };
  }

  if (typeof rawImage !== "string" || rawImage.trim().length === 0) {
    throw new HttpError(400, "imageBase64 is required.");
  }
  const normalized = rawImage.trim();
  if (normalized.startsWith("data:image/")) {
    if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(normalized)) {
      throw new HttpError(400, "Invalid image data URL.");
    }
    if (normalized.length > MAX_BASE64_LEN) {
      throw new HttpError(
        413,
        "Image is too large. Please try a smaller or compressed image.",
      );
    }
    const mime =
      /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(normalized)?.[1]?.toLowerCase() ??
      "image/jpeg";
    return { dataUrl: normalized, mimeType: mime };
  }
  const mimeType =
    typeof rawMime === "string" && rawMime.trim().length > 0
      ? rawMime.trim().toLowerCase()
      : "image/jpeg";
  if (!/^image\/[a-z0-9.+-]+$/i.test(mimeType)) {
    throw new HttpError(400, "mimeType must be an image mime type.");
  }
  if (normalized.length > MAX_BASE64_LEN) {
    throw new HttpError(
      413,
      "Image is too large. Please try a smaller or compressed image.",
    );
  }
  return {
    dataUrl: `data:${mimeType};base64,${normalized}`,
    mimeType,
  };
}

function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const marker = ";base64,";
  const idx = dataUrl.indexOf(marker);
  if (idx === -1) {
    throw new HttpError(400, "Invalid image data URL.");
  }
  const b64 = dataUrl.slice(idx + marker.length);
  const bytes = Buffer.from(b64, "base64");
  return new Blob([bytes], { type: mimeType });
}

async function classifyWithSpoonacular(
  image: { dataUrl?: string; imageUrl?: string; mimeType: string },
): Promise<string | null> {
  const key = env.SPOONACULAR_API_KEY;
  if (!key) {
    throw new HttpError(503, "Spoonacular is not configured.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SPOONACULAR_TIMEOUT_MS);
  try {
    let url: URL;
    let reqInit: RequestInit;
    if (image.imageUrl) {
      url = new URL("/food/images/classify", env.SPOONACULAR_BASE_URL);
      url.searchParams.set("apiKey", key);
      url.searchParams.set("imageUrl", image.imageUrl);
      reqInit = {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      };
    } else if (image.dataUrl) {
      url = new URL("/food/images/classify", env.SPOONACULAR_BASE_URL);
      url.searchParams.set("apiKey", key);
      const fd = new FormData();
      fd.append("file", dataUrlToBlob(image.dataUrl, image.mimeType), "snap.jpg");
      reqInit = {
        method: "POST",
        body: fd,
        signal: controller.signal,
      };
    } else {
      throw new HttpError(400, "No image provided.");
    }

    const res = await fetch(url, reqInit);
    const payload = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      return null;
    }
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const body = payload as Record<string, unknown>;
    const choices = [
      body.category,
      body.categoryName,
      body.name,
      body.title,
      body.dishType,
    ];
    for (const c of choices) {
      if (typeof c === "string" && c.trim().length > 0) {
        return c.trim();
      }
    }
    const ann = body.annotations;
    if (Array.isArray(ann)) {
      for (const row of ann) {
        if (!row || typeof row !== "object") continue;
        const n = (row as Record<string, unknown>).annotation;
        if (typeof n === "string" && n.trim().length > 0) {
          return n.trim();
        }
      }
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function toAiPhotoRecipe(base: RecipePublic): RecipePublic {
  const now = new Date().toISOString();
  return {
    ...base,
    id: `ai-photo:${randomUUID()}`,
    ownerId: "external",
    tags: [...new Set([...(base.tags ?? []), "photo-ai"])].slice(0, 20),
    updatedAt: now,
  };
}

export async function createRecipeFromPhoto(body: unknown): Promise<CreatedRecipe> {
  cleanupCache(Date.now());
  const image = parseIncomingImage(body);
  let sourceModel = "spoonacular:classify+search";
  let baseRecipe: RecipePublic | null = null;

  try {
    const guessed = await classifyWithSpoonacular(image);
    if (guessed) {
      const search = await searchRecipes({
        query: guessed,
        number: 1,
      });
      const row = search.results[0];
      if (row && Number.isInteger(row.id) && row.id > 0) {
        baseRecipe = await getRecipeInformation(row.id);
      }
    }
  } catch {
    baseRecipe = null;
  }

  if (!baseRecipe) {
    const random = await getRandomRecipes(1);
    if (!random[0]) {
      throw new HttpError(502, "Could not infer recipe from photo.");
    }
    sourceModel = "spoonacular:random-fallback";
    baseRecipe = random[0];
  }

  const recipe = toAiPhotoRecipe(baseRecipe);
  cache.set(recipe.id, {
    recipe,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return { recipe, model: sourceModel };
}

export async function getPhotoRecipeById(id: string): Promise<RecipePublic> {
  cleanupCache(Date.now());
  if (!id.startsWith("ai-photo:")) {
    throw new HttpError(400, "Invalid photo recipe id.");
  }
  const row = cache.get(id);
  if (!row) {
    throw new HttpError(404, "Photo recipe expired. Scan again.");
  }
  if (row.expiresAt <= Date.now()) {
    cache.delete(id);
    throw new HttpError(404, "Photo recipe expired. Scan again.");
  }
  return row.recipe;
}
