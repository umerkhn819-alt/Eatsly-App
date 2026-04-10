import { MongoClient, type Db } from "mongodb";
import { env } from "../config/env.js";

let client: MongoClient | null = null;

export function getDb(): Db {
  if (!client) {
    throw new Error("MongoDB is not connected");
  }
  return client.db(env.MONGODB_DB);
}

export async function connectMongo(): Promise<MongoClient> {
  if (client) {
    return client;
  }
  const next = new MongoClient(env.MONGODB_URI);
  await next.connect();
  client = next;
  return client;
}

export function getMongoClient(): MongoClient | null {
  return client;
}

export async function disconnectMongo(): Promise<void> {
  if (!client) {
    return;
  }
  await client.close();
  client = null;
}
