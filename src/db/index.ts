import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

let cachedPool: Pool | undefined;
let cachedDb: NodePgDatabase<typeof schema> | undefined;

export function getDb() {
  if (!cachedPool) {
    let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("Environment variable DATABASE_URL or POSTGRES_URL is required.");
    }
    
    // Clean connection string to prevent pg-connection-string from overriding SSL config
    try {
      const dbUrl = new URL(connectionString);
      dbUrl.searchParams.delete("sslmode");
      connectionString = dbUrl.toString();
    } catch {
      // fallback if URL is not standard
    }

    const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

    cachedPool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
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
