import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

export namespace PostgresBoundary {
  export const Config = {
    HOST: "localhost",
    USERNAME: "postgres",
    PASSWORD: "postgres",
  };

  type QueryOptions = {
    database: string;
    table: string;
  };
  type QueryResult = Array<{ id: number } & Record<string, string | number | boolean | null>>;
  export async function query({ database, table }: QueryOptions): Promise<QueryResult> {
    return await executeSql(database, `select id, * from ${table}`);
  }

  type MultiDeleteOptions = {
    database: string;
    table: string;
    ids: number[];
  };
  export async function multiDelete({ database, table, ids }: MultiDeleteOptions) {
    return await executeSql(database, `delete from ${table} where id in (${ids.join(",")})`);
  }

  async function executeSql(database: string, sqlToExecute: string): Promise<QueryResult> {
    const client = new Client({
      host: Config.HOST,
      user: Config.USERNAME,
      password: Config.PASSWORD,
      database: database,
    });
    try {
      await client.connect();
      const db = drizzle(client);
      const result = await db.execute(sql.raw(sqlToExecute));
      return result.rows as QueryResult;
    } finally {
      await client.end();
    }
  }
}
