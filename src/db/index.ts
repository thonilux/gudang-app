import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

let cachedPool: Pool | undefined;
let cachedDb: NodePgDatabase<typeof schema> | undefined;

export function getDb() {
  if (!cachedPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("Environment variable DATABASE_URL or POSTGRES_URL is required.");
    }
    cachedPool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }

  if (!cachedDb) {
    cachedDb = drizzle(cachedPool, {
      schema,
    });
  }

  return cachedDb;
}

export type Database = ReturnType<typeof getDb>;
