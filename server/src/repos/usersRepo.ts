import {
  MongoServerError,
  ObjectId,
  type Collection,
  type Filter,
  type UpdateFilter,
} from "mongodb";
import {
  USERS_COLLECTION,
  type UserDocument,
  type UserRole,
} from "../domain/user.js";
import { getDb } from "../db/mongo.js";

function usersCollection(): Collection<UserDocument> {
  return getDb().collection<UserDocument>(USERS_COLLECTION);
}

export async function ensureUserIndexes(): Promise<void> {
  const col = usersCollection();
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex({ createdAt: -1 });
}

export async function findUserByEmail(
  email: string,
): Promise<UserDocument | null> {
  return usersCollection().findOne({ email } satisfies Filter<UserDocument>);
}

export async function findUserById(
  id: string,
): Promise<UserDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return usersCollection().findOne({
    _id: new ObjectId(id),
  } satisfies Filter<UserDocument>);
}

export async function insertUser(input: {
  email: string;
  passwordHash: string;
  role: UserRole;
}): Promise<{ id: string }> {
  const now = new Date();
  try {
    const result = await usersCollection().insertOne({
      _id: new ObjectId(),
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    });
    return { id: result.insertedId.toHexString() };
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw err;
    }
    throw err;
  }
}

export async function listUsersPage(input: {
  limit: number;
  offset: number;
}): Promise<{ items: UserDocument[]; total: number }> {
  const col = usersCollection();
  const [items, total] = await Promise.all([
    col
      .find({})
      .sort({ createdAt: -1 })
      .skip(input.offset)
      .limit(input.limit)
      .toArray(),
    col.countDocuments({}),
  ]);
  return { items, total };
}

export async function updateUserRole(
  id: string,
  role: UserRole,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const result = await usersCollection().updateOne(
    { _id: new ObjectId(id) } satisfies Filter<UserDocument>,
    {
      $set: {
        role,
        updatedAt: new Date(),
      },
    } satisfies UpdateFilter<UserDocument>,
  );
  return result.matchedCount === 1;
}
