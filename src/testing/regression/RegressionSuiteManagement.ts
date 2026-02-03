import * as schema from "@/drizzle/schema";
import { $action, $execution, $notificationPolicyMetadata, $scheduleMetadata } from "@/drizzle/schema";
import { initializeSqlite, Sqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { describe, test } from "bun:test";
import { getTableName, InferInsertModel } from "drizzle-orm";
import { basename, dirname, join } from "path";

/**
 * This method contains skippable methods
 */
describe("regression suite management", async () => {
  test.skip("manually update the regression suite", async () => {
    // Use the methods below to update the regression suite
  });
});

export namespace RegressionSuiteManagement {
  export type ConfigurationJson = {
    filename: string;
    json: any;
  };
  const suitePath = join(import.meta.dir, "suite");
  export async function readConfigurationJsons(): Promise<ConfigurationJson[]> {
    const glob = new Bun.Glob("*.json");
    const files = await Array.fromAsync(glob.scan({ cwd: suitePath, absolute: true }));
    const output = await Promise.all(
      [...files].map<Promise<ConfigurationJson>>(async (file) => ({
        filename: basename(file),
        json: await Bun.file(file).json(),
      })),
    );
    if (output.length === 0) {
      throw new Error(`Couldn't find configuration JSONs: ${suitePath}`);
    }
    return output;
  }
  export async function writeConfigurationJsons(input: ConfigurationJson[]): Promise<void> {
    await Promise.all(
      input.map(async ({ filename, json }) => {
        const path = join(suitePath, filename);
        await Bun.write(path, JSON.stringify(json, null, 2));
      }),
    );
  }

  type Schema = typeof schema;
  type TableKey = Exclude<Extract<keyof Schema, string>, `${string}Relations`>;
  type Tables = {
    [K in TableKey]: Schema[K];
  };
  type TableRecords = {
    [K in keyof Tables]: Array<InferInsertModel<Tables[K]>>;
  };
  export function getTables() {
    const tables: Tables = {
      $execution: $execution,
      $action: $action,
      $scheduleMetadata: $scheduleMetadata,
      $notificationPolicyMetadata: $notificationPolicyMetadata,
    };
    return Object.values(tables).map((table) => ({
      table,
      tableName: getTableName(table),
    }));
  }

  const databasePath = join(suitePath, "db.sqlite");
  export async function getRegressionDatabaseCopy(): Promise<Sqlite> {
    const file = Bun.file(databasePath);
    if (!(await file.exists())) {
      throw new Error(`Regression database not found: ${databasePath}`);
    }
    const databaseCopyPath = join(dirname(databasePath), "dbcopy.sqlite");
    await Bun.write(databaseCopyPath, file);
    // TODO: copy/overwrite to (.gitignored) temp file
    return await initializeSqlite({ X_BRESPI_DATABASE: databaseCopyPath } as Env.Private);
  }
  export async function replaceDatabaseEntries({
    $execution: executions,
    $action: actions,
    $scheduleMetadata: scheduleMetadatas,
    $notificationPolicyMetadata: notificationPolicyMetadatas,
  }: TableRecords) {
    const file = Bun.file(databasePath);
    if (await file.exists()) {
      await file.delete();
    }
    const sqlite = await initializeSqlite({ X_BRESPI_DATABASE: databasePath } as Env.Private);
    if (executions.length > 0) {
      await sqlite.insert($execution).values(executions);
    }
    if (actions.length > 0) {
      await sqlite.insert($action).values(actions);
    }
    if (scheduleMetadatas.length > 0) {
      await sqlite.insert($scheduleMetadata).values(scheduleMetadatas);
    }
    if (notificationPolicyMetadatas.length > 0) {
      await sqlite.insert($notificationPolicyMetadata).values(notificationPolicyMetadatas);
    }
    sqlite.close();
    return databasePath;
  }
}
