import {
  MongoServerError,
  ObjectId,
  type Collection,
  type Filter,
} from "mongodb";
import {
  FAVORITES_COLLECTION,
  type FavoriteDocument,
} from "../domain/favorite.js";
import { getDb } from "../db/mongo.js";

function favoritesCollection(): Collection<FavoriteDocument> {
  return getDb().collection<FavoriteDocument>(FAVORITES_COLLECTION);
}

export async function ensureFavoriteIndexes(): Promise<void> {
  const col = favoritesCollection();
  await col.createIndex({ userId: 1, recipeId: 1 }, { unique: true });
  await col.createIndex({ userId: 1, createdAt: -1 });
}

export async function insertFavorite(input: {
  userId: ObjectId;
  recipeId: ObjectId;
}): Promise<{ created: true } | { created: false; duplicate: true }> {
  const now = new Date();
  try {
    await favoritesCollection().insertOne({
      _id: new ObjectId(),
      userId: input.userId,
      recipeId: input.recipeId,
      createdAt: now,
    });
    return { created: true };
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      return { created: false, duplicate: true };
    }
    throw err;
  }
}

export async function deleteFavorite(input: {
  userId: ObjectId;
  recipeId: ObjectId;
}): Promise<boolean> {
  const result = await favoritesCollection().deleteOne({
    userId: input.userId,
    recipeId: input.recipeId,
  } satisfies Filter<FavoriteDocument>);
  return result.deletedCount === 1;
}

export async function deleteFavoritesByRecipeId(recipeId: ObjectId): Promise<void> {
  await favoritesCollection().deleteMany({
    recipeId,
  } satisfies Filter<FavoriteDocument>);
}

export async function listFavoritesPage(input: {
  userId: ObjectId;
  limit: number;
  offset: number;
}): Promise<{
  items: Array<{ recipeId: ObjectId; createdAt: Date }>;
  total: number;
}> {
  const filter: Filter<FavoriteDocument> = { userId: input.userId };
  const col = favoritesCollection();

  const [rows, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(input.offset)
      .limit(input.limit)
      .project({ recipeId: 1, createdAt: 1, _id: 0 })
      .toArray(),
    col.countDocuments(filter),
  ]);

  const items = rows.map((r) => ({
    recipeId: r.recipeId,
    createdAt: r.createdAt,
  }));

  return { items, total };
}

export async function countFavorites(): Promise<number> {
  return favoritesCollection().countDocuments({});
}
