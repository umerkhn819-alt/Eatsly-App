import { ObjectId } from "mongodb";
import type { RecipeDocument, RecipeIngredient, RecipePublic } from "../domain/recipe.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { UserRole } from "../domain/user.js";
import * as favoritesRepo from "../repos/favoritesRepo.js";
import * as recipesRepo from "../repos/recipesRepo.js";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 20_000;
const INGREDIENT_NAME_MAX = 200;
const STEP_MAX = 5_000;
const TAG_MAX = 40;
const MAX_TAGS = 30;
const MAX_INGREDIENTS = 200;
const MAX_STEPS = 200;

function clampInt(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpError(400, `${name} must be a number`);
  }
  const n = Math.trunc(value);
  if (n < min || n > max) {
    throw new HttpError(400, `${name} must be between ${min} and ${max}`);
  }
  return n;
}

function assertNonEmptyString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }
  const s = value.trim();
  if (s.length === 0) {
    throw new HttpError(400, `${field} is required`);
  }
  if (s.length > max) {
    throw new HttpError(400, `${field} is too long`);
  }
  return s;
}

function parseIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    throw new HttpError(400, "ingredients must be an array");
  }
  if (value.length > MAX_INGREDIENTS) {
    throw new HttpError(400, "Too many ingredients");
  }
  return value.map((row, idx) => {
    if (!row || typeof row !== "object") {
      throw new HttpError(400, `Invalid ingredient at index ${idx}`);
    }
    const r = row as Record<string, unknown>;
    const name = assertNonEmptyString(r.name, `ingredients[${idx}].name`, INGREDIENT_NAME_MAX);
    const amountRaw = r.amount;
    let amount: string | undefined;
    if (amountRaw !== undefined && amountRaw !== null) {
      if (typeof amountRaw !== "string") {
        throw new HttpError(400, `ingredients[${idx}].amount must be a string`);
      }
      const a = amountRaw.trim();
      if (a.length > 80) {
        throw new HttpError(400, `ingredients[${idx}].amount is too long`);
      }
      amount = a.length > 0 ? a : undefined;
    }
    return amount ? { name, amount } : { name };
  });
}

function parseSteps(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new HttpError(400, "steps must be an array");
  }
  if (value.length > MAX_STEPS) {
    throw new HttpError(400, "Too many steps");
  }
  const steps = value.map((s, idx) => {
    if (typeof s !== "string") {
      throw new HttpError(400, `Invalid step at index ${idx}`);
    }
    const t = s.trim();
    if (t.length === 0) {
      throw new HttpError(400, `Step ${idx + 1} is empty`);
    }
    if (t.length > STEP_MAX) {
      throw new HttpError(400, `Step ${idx + 1} is too long`);
    }
    return t;
  });
  if (steps.length === 0) {
    throw new HttpError(400, "At least one step is required");
  }
  return steps;
}

function parseTags(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new HttpError(400, "tags must be an array");
  }
  if (value.length > MAX_TAGS) {
    throw new HttpError(400, "Too many tags");
  }
  const tags: string[] = [];
  for (const t of value) {
    if (typeof t !== "string") {
      throw new HttpError(400, "Each tag must be a string");
    }
    const s = t.trim().toLowerCase();
    if (s.length === 0) {
      continue;
    }
    if (s.length > TAG_MAX) {
      throw new HttpError(400, "A tag is too long");
    }
    if (!tags.includes(s)) {
      tags.push(s);
    }
  }
  return tags;
}

export function parseCreateBody(body: unknown): Omit<
  RecipeDocument,
  "_id" | "ownerId" | "createdAt" | "updatedAt"
> {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "JSON body is required");
  }
  const b = body as Record<string, unknown>;

  const title = assertNonEmptyString(b.title, "title", TITLE_MAX);
  const description =
    typeof b.description === "string" ? b.description.trim() : "";
  if (description.length > DESCRIPTION_MAX) {
    throw new HttpError(400, "description is too long");
  }

  const ingredients = parseIngredients(b.ingredients);
  const steps = parseSteps(b.steps);
  const tags = parseTags(b.tags);

  const prepMinutes = clampInt(b.prepMinutes, "prepMinutes", 0, 24 * 60);
  const cookMinutes = clampInt(b.cookMinutes, "cookMinutes", 0, 24 * 60);
  const servings = clampInt(b.servings, "servings", 1, 200);

  if (ingredients.length === 0) {
    throw new HttpError(400, "At least one ingredient is required");
  }

  return {
    title,
    description,
    ingredients,
    steps,
    tags,
    prepMinutes,
    cookMinutes,
    servings,
  };
}

export function parsePatchBody(body: unknown): Partial<
  Pick<
    RecipeDocument,
    | "title"
    | "description"
    | "ingredients"
    | "steps"
    | "tags"
    | "prepMinutes"
    | "cookMinutes"
    | "servings"
  >
> {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "JSON body is required");
  }
  const b = body as Record<string, unknown>;
  const patch: Partial<
    Pick<
      RecipeDocument,
      | "title"
      | "description"
      | "ingredients"
      | "steps"
      | "tags"
      | "prepMinutes"
      | "cookMinutes"
      | "servings"
    >
  > = {};

  if ("title" in b) {
    patch.title = assertNonEmptyString(b.title, "title", TITLE_MAX);
  }
  if ("description" in b) {
    if (typeof b.description !== "string") {
      throw new HttpError(400, "description must be a string");
    }
    const d = b.description.trim();
    if (d.length > DESCRIPTION_MAX) {
      throw new HttpError(400, "description is too long");
    }
    patch.description = d;
  }
  if ("ingredients" in b) {
    patch.ingredients = parseIngredients(b.ingredients);
    if (patch.ingredients.length === 0) {
      throw new HttpError(400, "At least one ingredient is required");
    }
  }
  if ("steps" in b) {
    patch.steps = parseSteps(b.steps);
  }
  if ("tags" in b) {
    patch.tags = parseTags(b.tags);
  }
  if ("prepMinutes" in b) {
    patch.prepMinutes = clampInt(b.prepMinutes, "prepMinutes", 0, 24 * 60);
  }
  if ("cookMinutes" in b) {
    patch.cookMinutes = clampInt(b.cookMinutes, "cookMinutes", 0, 24 * 60);
  }
  if ("servings" in b) {
    patch.servings = clampInt(b.servings, "servings", 1, 200);
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, "No valid fields to update");
  }

  return patch;
}

export function toPublicRecipe(doc: RecipeDocument): RecipePublic {
  return {
    id: doc._id.toHexString(),
    ownerId: doc.ownerId.toHexString(),
    title: doc.title,
    description: doc.description,
    ingredients: doc.ingredients,
    steps: doc.steps,
    tags: doc.tags,
    prepMinutes: doc.prepMinutes,
    cookMinutes: doc.cookMinutes,
    servings: doc.servings,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function canManageRecipe(input: {
  recipe: RecipeDocument;
  userId: string;
  role: UserRole;
}): boolean {
  if (input.role === "admin") {
    return true;
  }
  return input.recipe.ownerId.toHexString() === input.userId;
}

export async function createRecipeForUser(input: {
  userId: string;
  body: unknown;
}): Promise<RecipePublic> {
  const parsed = parseCreateBody(input.body);
  const now = new Date();
  const ownerId = new ObjectId(input.userId);
  const { id } = await recipesRepo.insertRecipe({
    ownerId,
    title: parsed.title,
    description: parsed.description,
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    tags: parsed.tags,
    prepMinutes: parsed.prepMinutes,
    cookMinutes: parsed.cookMinutes,
    servings: parsed.servings,
    createdAt: now,
    updatedAt: now,
  });

  const created = await recipesRepo.findRecipeById(id);
  if (!created) {
    throw new HttpError(500, "Recipe was not found after insert");
  }
  return toPublicRecipe(created);
}

export async function listRecipes(input: {
  userId: string;
  mineOnly: boolean;
  limit: number;
  offset: number;
}): Promise<{ recipes: RecipePublic[]; total: number }> {
  const ownerId = input.mineOnly ? new ObjectId(input.userId) : undefined;
  const { items, total } = await recipesRepo.listRecipesPage({
    ownerId,
    limit: input.limit,
    offset: input.offset,
  });
  return { recipes: items.map(toPublicRecipe), total };
}

export async function getRecipeById(id: string): Promise<RecipePublic> {
  const doc = await recipesRepo.findRecipeById(id);
  if (!doc) {
    throw new HttpError(404, "Recipe not found");
  }
  return toPublicRecipe(doc);
}

export async function updateRecipe(input: {
  id: string;
  userId: string;
  role: UserRole;
  body: unknown;
}): Promise<RecipePublic> {
  const existing = await recipesRepo.findRecipeById(input.id);
  if (!existing) {
    throw new HttpError(404, "Recipe not found");
  }
  if (!canManageRecipe({ recipe: existing, userId: input.userId, role: input.role })) {
    throw new HttpError(403, "You do not have permission to update this recipe");
  }

  const patch = parsePatchBody(input.body);
  const ok = await recipesRepo.updateRecipeById(input.id, {
    ...patch,
    updatedAt: new Date(),
  });
  if (!ok) {
    throw new HttpError(404, "Recipe not found");
  }

  const updated = await recipesRepo.findRecipeById(input.id);
  if (!updated) {
    throw new HttpError(500, "Recipe was not found after update");
  }
  return toPublicRecipe(updated);
}

export async function deleteRecipe(input: {
  id: string;
  userId: string;
  role: UserRole;
}): Promise<void> {
  const existing = await recipesRepo.findRecipeById(input.id);
  if (!existing) {
    throw new HttpError(404, "Recipe not found");
  }
  if (!canManageRecipe({ recipe: existing, userId: input.userId, role: input.role })) {
    throw new HttpError(403, "You do not have permission to delete this recipe");
  }

  const ok = await recipesRepo.deleteRecipeById(input.id);
  if (!ok) {
    throw new HttpError(404, "Recipe not found");
  }

  await favoritesRepo.deleteFavoritesByRecipeId(new ObjectId(input.id));
}

export function parseListQuery(query: Record<string, unknown>): {
  mineOnly: boolean;
  limit: number;
  offset: number;
} {
  const mineRaw = query.mine;
  const mineOnly =
    mineRaw === "1" ||
    mineRaw === "true" ||
    mineRaw === true;

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

  return { mineOnly, limit, offset };
}
