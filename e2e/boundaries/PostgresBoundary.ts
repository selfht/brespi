import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

export namespace PostgresBoundary {
  type Row = Record<string, string | number | boolean | null>;

  export async function database(operation: "create" | "drop", table: string): Promise<void> {
    throw new Error("Not implemented");
  }

  export async function table(operation: "create" | "drop", table: string): Promise<void> {
    throw new Error("Not implemented");
  }

  type InsertOptions = {
    table: string;
    rows: Row[];
  };
  export async function insert({ table, rows }: InsertOptions): Promise<void> {
    throw new Error("Not implemented");
  }

  type QueryOptions = {
    database: string;
    table: string;
  };
  export async function queryAll({ database, table }: QueryOptions): Promise<Row[]> {
    return await execute({ database, sql: `select id, * from ${table}` });
  }

  type ExecuteOptions = {
    database: string;
    sql: string;
  };
  export async function execute({ database, sql: sqlToExecute }: ExecuteOptions): Promise<Row[]> {
    const client = new Client({
      host: "localhost",
      user: "postgres",
      password: "postgres",
      database: database,
    });
    try {
      await client.connect();
      const db = drizzle(client);
      const result = await db.execute(sql.raw(sqlToExecute));
      return result.rows as Row[];
    } finally {
      await client.end();
    }
  }
}
