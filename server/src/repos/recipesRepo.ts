import {
  ObjectId,
  type Collection,
  type Filter,
  type UpdateFilter,
} from "mongodb";
import { RECIPES_COLLECTION, type RecipeDocument } from "../domain/recipe.js";
import { getDb } from "../db/mongo.js";

function recipesCollection(): Collection<RecipeDocument> {
  return getDb().collection<RecipeDocument>(RECIPES_COLLECTION);
}

export async function ensureRecipeIndexes(): Promise<void> {
  const col = recipesCollection();
  await col.createIndex({ ownerId: 1, createdAt: -1 });
  await col.createIndex({ createdAt: -1 });
}

export async function insertRecipe(doc: Omit<RecipeDocument, "_id">): Promise<{
  id: string;
}> {
  const _id = new ObjectId();
  await recipesCollection().insertOne({ _id, ...doc });
  return { id: _id.toHexString() };
}

export async function insertRecipes(docs: Array<Omit<RecipeDocument, "_id">>): Promise<number> {
  if (docs.length === 0) {
    return 0;
  }
  const payload = docs.map((doc) => ({ _id: new ObjectId(), ...doc }));
  const result = await recipesCollection().insertMany(payload);
  return result.insertedCount;
}

export async function findRecipeById(
  id: string,
): Promise<RecipeDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return recipesCollection().findOne({
    _id: new ObjectId(id),
  } satisfies Filter<RecipeDocument>);
}

export async function findRecipesByIds(
  ids: ObjectId[],
): Promise<RecipeDocument[]> {
  if (ids.length === 0) {
    return [];
  }
  return recipesCollection()
    .find({ _id: { $in: ids } } satisfies Filter<RecipeDocument>)
    .toArray();
}

export async function listRecipesPage(input: {
  ownerId?: ObjectId;
  limit: number;
  offset: number;
}): Promise<{ items: RecipeDocument[]; total: number }> {
  const filter: Filter<RecipeDocument> = {};
  if (input.ownerId) {
    filter.ownerId = input.ownerId;
  }

  const col = recipesCollection();
  const [items, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(input.offset)
      .limit(input.limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return { items, total };
}

export async function updateRecipeById(
  id: string,
  patch: Partial<
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
  > & { updatedAt: Date },
): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const result = await recipesCollection().updateOne(
    { _id: new ObjectId(id) } satisfies Filter<RecipeDocument>,
    { $set: patch } satisfies UpdateFilter<RecipeDocument>,
  );
  return result.matchedCount === 1;
}

export async function deleteRecipeById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const result = await recipesCollection().deleteOne({
    _id: new ObjectId(id),
  } satisfies Filter<RecipeDocument>);
  return result.deletedCount === 1;
}

export async function findRecentRecipeTitles(limit: number): Promise<string[]> {
  const col = recipesCollection();
  const rows = await col
    .find({})
    .project({ title: 1, _id: 0 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return rows
    .map((r) => (typeof r.title === "string" ? r.title.trim() : ""))
    .filter((t) => t.length > 0);
}

export async function countRecipes(): Promise<number> {
  return recipesCollection().countDocuments({});
}

export async function deleteManyByTitles(titles: string[]): Promise<number> {
  if (titles.length === 0) return 0;
  const result = await recipesCollection().deleteMany({ title: { $in: titles } });
  return result.deletedCount;
}
