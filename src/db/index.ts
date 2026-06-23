import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

let cachedPool: Pool | undefined;
let cachedDb: NodePgDatabase<typeof schema> | undefined;

export function getDb() {
  if (!cachedPool) {
    cachedPool = new Pool({
      connectionString: getRequiredEnv("DATABASE_URL"),
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
