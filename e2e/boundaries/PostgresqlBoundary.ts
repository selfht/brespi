import { Client } from "pg";

export namespace PostgresqlBoundary {
  export type Row = Record<string, string | number | boolean | null>;

  type DatabaseOptions = {
    operation: "create" | "drop";
    database: string;
  };
  export async function database({ operation, database }: DatabaseOptions): Promise<void> {
    if (operation === "create") {
      await execute({ database: "postgresql", sql: `CREATE DATABASE ${database}` });
    } else {
      await execute({ database: "postgresql", sql: `DROP DATABASE IF EXISTS ${database}` });
    }
  }

  type TableOptions = {
    database: string;
    table: string;
  } & (
    | {
        operation: "create";
        tableDefinition: Record<string, string>;
      }
    | {
        operation: "drop";
      }
  );
  export async function table({ database, table, ...opts }: TableOptions): Promise<void> {
    if (opts.operation === "create") {
      const columns = Object.entries(opts.tableDefinition)
        .map(([name, type]) => `${name} ${type}`)
        .join(", ");
      await execute({ database, sql: `CREATE TABLE ${table} (${columns})` });
    } else {
      await execute({ database, sql: `DROP TABLE IF EXISTS ${table}` });
    }
  }

  type InsertOptions = {
    database: string;
    table: string;
    rows: Row[];
  };
  export async function insert({ database, table, rows }: InsertOptions): Promise<void> {
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const values = rows
      .map(
        (row) =>
          `(${columns
            .map((col) => {
              const value = row[col];
              if (value === null) return "NULL";
              if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
              return value;
            })
            .join(", ")})`,
      )
      .join(", ");
    await execute({
      database,
      sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values}`,
    });
  }

  type SetupOptions = {
    database: string;
    tables: Array<{
      name: string;
      initialRows: Row[];
    }>;
  };
  export async function setup({ database, tables }: SetupOptions): Promise<void> {
    await PostgresqlBoundary.database({ operation: "drop", database });
    await PostgresqlBoundary.database({ operation: "create", database });
    for (const { name: table, initialRows: rows } of tables) {
      if (rows.length === 0) {
        throw new Error(`Table ${table} must have at least one row to infer schema`);
      }
      const firstRow = rows[0];
      const tableDefinition: Record<string, string> = {};
      for (const [key, value] of Object.entries(firstRow)) {
        if (value === null) {
          throw new Error(`First row cannot have null values (found null in column ${key})`);
        }
        tableDefinition[key] = inferColumnType(key, value);
      }
      await PostgresqlBoundary.table({ operation: "create", database, table, tableDefinition });
      await PostgresqlBoundary.insert({ database, table, rows });
    }
  }

  function inferColumnType(key: string, value: string | number | boolean): string {
    if (key === "id" && typeof value === "number") {
      return "SERIAL PRIMARY KEY";
    }
    if (typeof value === "number") {
      return Number.isInteger(value) ? "INTEGER" : "REAL";
    }
    if (typeof value === "string") {
      return "TEXT";
    }
    if (typeof value === "boolean") {
      return "BOOLEAN";
    }
    throw new Error(`Cannot infer type for column ${key} with value ${value}`);
  }

  type QueryOptions = {
    database: string;
    table: string;
  };
  export async function queryAll({ database, table }: QueryOptions): Promise<Row[]> {
    return await execute({ database, sql: `SELECT * FROM ${table}` });
  }

  type ExecuteOptions = {
    database: string;
    sql: string;
  };
  export async function execute({ database, sql: sqlToExecute }: ExecuteOptions): Promise<Row[]> {
    const client = new Client({
      host: "localhost",
      user: "postgresql",
      password: "postgresql",
      database: database,
    });
    try {
      await client.connect();
      const result = await client.query(sqlToExecute);
      return result.rows as Row[];
    } finally {
      await client.end();
    }
  }
}
