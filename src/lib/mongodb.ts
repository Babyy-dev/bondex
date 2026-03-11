/**
 * MongoDB connection singleton.
 * In development: cached on `global` to survive hot-module reloads.
 * In production (Vercel serverless): module-level promise is fine — each
 * function instance reuses the same connection within its lifetime.
 */
import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME     = process.env.MONGODB_DB ?? "bondex";

if (!MONGODB_URI) {
  throw new Error("[BondEx] Missing MONGODB_URI environment variable.");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(MONGODB_URI).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(MONGODB_URI).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}
