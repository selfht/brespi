import { FilesystemAdapter } from "@/adapters/filesystem/FilesystemAdapter";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { Sqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { Configuration } from "@/models/Configuration";
import { Step } from "@/models/Step";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { rm } from "fs/promises";
import { RegressionSuite } from "./RegressionSuite";
import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";

describe("regression", () => {
  let database!: Sqlite;

  beforeEach(async () => {
    database?.close();
    database = await RegressionSuite.Database.getRegressionDatabaseCopy();
  });

  afterAll(async () => {
    await rm(RegressionSuite.Path.suiteTmp, { recursive: true, force: true });
  });

  describe("configuration parsing", async () => {
    for (const { filename, json } of await RegressionSuite.Configuration.readJsons()) {
      it(filename, () => {
        // when
        Configuration.Core.parse(json);
        // then (no errors)
      });
    }
  });

  describe("database querying", async () => {
    for (const { tableName, table } of RegressionSuite.Database.getTableOverview()) {
      it(tableName, async () => {
        // when
        const records = await database.select().from(table);
        // then
        expect(records.length).toBeGreaterThan(0);
      });
    }
  });

  describe("managed storage listing", async () => {
    for (const { name, path } of await RegressionSuite.ManagedStorage.getStorageRootCopies()) {
      it(name, async () => {
        // given
        const env = {
          O_BRESPI_VERSION: "0.0.0",
          O_BRESPI_COMMIT: "1234567",
          X_BRESPI_TMP_ROOT: RegressionSuite.Path.suiteTmp,
        } as Env.Private;
        const filesystemAdapter = new FilesystemAdapter(
          env,
          new PropertyResolver(),
          new ManagedStorageCapability(env),
          new FilterCapability(),
        );

        // when
        const readLatestArtifacts = async () => {
          const { artifacts } = await filesystemAdapter.read({
            id: "-",
            object: "step",
            type: Step.Type.filesystem_read,
            path,
            managedStorage: { target: "latest" },
          });
          return artifacts;
        };
        // then
        const originalLength = (await readLatestArtifacts()).length;
        expect(originalLength).toBeGreaterThan(0);

        // when
        await filesystemAdapter.write(
          await RegressionSuite.ManagedStorage.saveTemporaryArtifacts(["lemons.txt", "apples.txt", "oranges.txt"]),
          {
            id: "-",
            object: "step",
            type: Step.Type.filesystem_write,
            folderPath: path,
            managedStorage: true,
          },
          [],
        );
        // then
        const newLatestArtifacts = await readLatestArtifacts();
        expect(newLatestArtifacts.length).toEqual(3);
        expect(newLatestArtifacts.map((a) => a.name)).toEqual(expect.arrayContaining(["lemons.txt", "apples.txt", "oranges.txt"]));
      });
    }
  });
});
