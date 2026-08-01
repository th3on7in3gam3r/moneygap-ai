import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as {
  db?: Db;
  /** Detect schema HMR so db.query picks up new tables */
  schemaRef?: typeof schema;
};

function getDb(): Db {
  if (
    process.env.NODE_ENV !== "production" &&
    globalForDb.schemaRef !== schema
  ) {
    globalForDb.schemaRef = schema;
    globalForDb.db = createDb();
    return globalForDb.db;
  }

  if (!globalForDb.db) {
    globalForDb.db = createDb();
    if (process.env.NODE_ENV !== "production") {
      globalForDb.schemaRef = schema;
    }
  }
  return globalForDb.db;
}

/**
 * Proxy so schema HMR recreates the client even when this module
 * itself is not re-evaluated (stale db.query.* otherwise).
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
