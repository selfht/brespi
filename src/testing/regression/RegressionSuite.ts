import { FilesystemAdapter } from "@/adapters/filesystem/FilesystemAdapter";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import * as schema from "@/drizzle/schema";
import { $action, $execution, $notificationPolicyMetadata, $scheduleMetadata } from "@/drizzle/schema";
import { initializeSqlite, Sqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Configuration as ModelConfiguration } from "@/models/Configuration";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { ActionConverter } from "@/repositories/converters/ActionConverter";
import { ExecutionConverter } from "@/repositories/converters/ExecutionConverter";
import { NotificationPolicyMetadataConverter } from "@/repositories/converters/NotificationPolicyMetadataConverter";
import { ScheduleMetadataConverter } from "@/repositories/converters/ScheduleMetadataConverter";
import { test } from "bun:test";
import { getTableName, InferInsertModel } from "drizzle-orm";
import { cp, mkdir } from "fs/promises";
import { basename, dirname, join } from "path";
import { TestFixture } from "../TestFixture.test";

test.skip("regression suite management", async () => {
  // This is a playground where the regression suite can be manually updated
  // See below for some examples
});

const Example = {
  async configuration() {
    await RegressionSuite.Configuration.writeJson("configuration_99.json", {
      pipelines: [
        {
          id: Bun.randomUUIDv7(),
          object: "pipeline",
          name: "Example",
          steps: [TestFixture.createStep(Step.Type.custom_script)],
        },
      ],
      schedules: [],
      notificationPolicies: [],
    });
  },
  async database() {
    await RegressionSuite.Database.insertIntoRegressionDatabase({
      $execution: [TestFixture.createExecution()].map((e) => ExecutionConverter.convert(e)),
      $action: [].map((a) => ActionConverter.convert(a)),
      $scheduleMetadata: [].map((s) => ScheduleMetadataConverter.convert(s)),
      $notificationPolicyMetadata: [].map((n) => NotificationPolicyMetadataConverter.convert(n)),
    });
  },
  async managedStorage() {
    await RegressionSuite.ManagedStorage.appendToStorageRoot("managed_storage_root_01", [
      {
        artifactNames: ["webshop.sql.tar.gz.enc", "crm.sql.tar.gz.enc"],
        trail: [
          { ...TestFixture.createStep(Step.Type.mariadb_backup), runtime: { driver: "1.0.0" } },
          { ...TestFixture.createStep(Step.Type.compression), runtime: null },
          { ...TestFixture.createStep(Step.Type.encryption), runtime: null },
        ],
      },
    ]);
  },
};

export namespace RegressionSuite {
  export const Path = {
    suite: join(import.meta.dir, "suite"),
    get suiteTmp() {
      return join(this.suite, ".tmp");
    },
  };

  const Prefix = {
    configuration: "configuration_",
    managedStorageRoot: "managed_storage_root_",
  };

  /**
   * Helper functions for reading/writing configurations
   */
  export namespace Configuration {
    type JsonResult = {
      filename: string;
      json: any;
    };
    export async function readJsons(): Promise<JsonResult[]> {
      const glob = new Bun.Glob(`${Prefix.configuration}*.json`);
      const files = await Array.fromAsync(glob.scan({ cwd: Path.suite, absolute: true }));
      const output = await Promise.all(
        [...files].map<Promise<JsonResult>>(async (file) => ({
          filename: basename(file),
          json: await Bun.file(file).json(),
        })),
      );
      if (output.length === 0) {
        throw new Error(`Couldn't find configuration JSONs: ${Path.suite}`);
      }
      return output;
    }

    export async function writeJson(filename: string, configuration: ModelConfiguration.Core): Promise<void> {
      const path = join(Path.suite, filename);
      await Bun.write(path, JSON.stringify(configuration, null, 2));
    }
  }

  /**
   * Helper functions for reading/writing the regression database
   */
  export namespace Database {
    type Schema = typeof schema;
    type TableKey = Exclude<Extract<keyof Schema, string>, `${string}Relations`>;
    type Tables = {
      [K in TableKey]: Schema[K];
    };
    type TableRecords = {
      [K in keyof Tables]: Array<InferInsertModel<Tables[K]>>;
    };
    export function getTableOverview() {
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

    const databasePath = join(Path.suite, "db.sqlite");
    export async function getRegressionDatabaseCopy(): Promise<Sqlite> {
      const file = Bun.file(databasePath);
      if (!(await file.exists())) {
        throw new Error(`Regression database not found: ${databasePath}`);
      }
      const databaseCopyPath = join(Path.suiteTmp, "db.sqlite");
      await Bun.write(databaseCopyPath, file);
      return await initializeSqlite({ X_BRESPI_DATABASE: databaseCopyPath } as Env.Private);
    }
    export async function insertIntoRegressionDatabase({
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

  /**
   * Helper functions for reading/writing managed storage roots
   */
  export namespace ManagedStorage {
    type StorageRoot = {
      name: string;
      path: string;
    };
    export async function getStorageRootCopies(): Promise<StorageRoot[]> {
      const glob = new Bun.Glob(`${Prefix.managedStorageRoot}*/__brespi_manifest__.json`);
      const manifestFiles = await Array.fromAsync(glob.scan({ cwd: Path.suite, absolute: true }));
      const result = manifestFiles.map((manifestPath) => {
        const rootPath = dirname(manifestPath);
        return {
          name: basename(rootPath),
          path: rootPath,
        };
      });
      if (result.length === 0) {
        throw new Error(`Couldn't find storage roots: ${Path.suite}`);
      }
      const copiedResult: StorageRoot[] = await Promise.all(
        result.map<Promise<StorageRoot>>(async ({ path, name }) => {
          const newPath = join(Path.suiteTmp, name);
          await cp(path, newPath, { recursive: true, force: true });
          return { name, path: newPath };
        }),
      );
      return copiedResult;
    }

    export async function saveTemporaryArtifacts(artifactNames: string[]): Promise<Array<Pick<Artifact, "type" | "name" | "path">>> {
      return await Promise.all(
        artifactNames.map(async (name) => {
          const path = join(Path.suiteTmp, `artifactName-${Bun.randomUUIDv7()}`);
          await Bun.write(path, `Contents for ${name}`);
          return {
            type: "file",
            name,
            path,
          };
        }),
      );
    }

    type Listing = {
      artifactNames: string[];
      trail: StepWithRuntime[];
    };
    export async function appendToStorageRoot(rootName: string, rootContents: Listing[]) {
      const env = { O_BRESPI_VERSION: "0.0.0", O_BRESPI_COMMIT: "0000000000000000000000000000000000000000" } as Env.Private;
      const filesystemAdapter = new FilesystemAdapter(env, new ManagedStorageCapability(env), new FilterCapability());
      const rootPath = join(Path.suite, rootName);
      for (const { artifactNames, trail } of rootContents) {
        await mkdir(Path.suiteTmp);
        const temporaryArtifacts = await saveTemporaryArtifacts(artifactNames);
        await filesystemAdapter.write(
          temporaryArtifacts,
          {
            id: "x",
            type: Step.Type.filesystem_write,
            object: "step",
            previousId: null,
            folderPath: rootPath,
            retention: null,
            managedStorage: true,
          },
          trail,
        );
      }
      // Pretty-print all generated JSON files in the storage root
      const glob = new Bun.Glob("**/*.json");
      const jsonFiles = await Array.fromAsync(glob.scan({ cwd: rootPath, absolute: true }));
      await Promise.all(
        jsonFiles.map(async (filePath) => {
          const json = await Bun.file(filePath).json();
          await Bun.write(filePath, JSON.stringify(json, null, 2));
        }),
      );
    }
  }
}
