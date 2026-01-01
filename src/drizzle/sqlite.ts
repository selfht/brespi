import { Env } from "@/Env";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

export async function initializeSqlite(env: Env.Private) {
  const database = new Database(env.X_BRESPI_DATABASE, { create: true });
  const sqlite = drizzle(database, {
    casing: "snake_case",
    schema,
  });
  migrate(sqlite, {
    migrationsFolder: "src/drizzle/migrations",
  });
  return sqlite;
}

export type Sqlite = Awaited<ReturnType<typeof initializeSqlite>>;
