import { FilesystemAdapter } from "@/adapters/filesystem/FilesystemAdapter";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { Sqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { Configuration } from "@/models/Configuration";
import { Step } from "@/models/Step";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { rm } from "fs/promises";
import { TestUtils } from "../TestUtils.test";
import { RegressionSuite } from "./RegressionSuite";

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
    const collection = TestUtils.createCollection("filename", await RegressionSuite.Configuration.readJsons());
    it.each(collection.testCases)("%s", (testCase) => {
      // given
      const { json } = collection.get(testCase);
      // when
      Configuration.Core.parse(json);
      // then (no errors)
    });
  });

  describe("database querying", async () => {
    const collection = TestUtils.createCollection("tableName", RegressionSuite.Database.getTableOverview());
    it.each(collection.testCases)("%s", async (testCase) => {
      // given
      const { table } = collection.get(testCase);
      // when
      const records = await database.select().from(table);
      // then
      expect(records.length).toBeGreaterThan(0);
    });
  });

  describe.only("managed storage listing", async () => {
    const collection = TestUtils.createCollection("name", await RegressionSuite.ManagedStorage.getStorageRootCopies());
    it.each(collection.testCases)("%s", async (testCase) => {
      // given
      const { path } = collection.get(testCase);
      const env = {
        O_BRESPI_VERSION: "0.0.0",
        O_BRESPI_COMMIT: "1234567",
        X_BRESPI_TMP_ROOT: RegressionSuite.Path.suiteTmp,
      } as Env.Private;
      const filesystemAdapter = new FilesystemAdapter(env, new ManagedStorageCapability(env), new FilterCapability());

      // when
      const readLatestArtifacts = async () => {
        const { artifacts } = await filesystemAdapter.read({
          id: "-",
          previousId: null,
          object: "step",
          type: Step.Type.filesystem_read,
          filterCriteria: null,
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
          previousId: null,
          object: "step",
          type: Step.Type.filesystem_write,
          folderPath: path,
          managedStorage: true,
          retention: null,
        },
        [],
      );
      // then
      const newLatestArtifacts = await readLatestArtifacts();
      expect(newLatestArtifacts.length).toEqual(3);
      expect(newLatestArtifacts.map((a) => a.name)).toEqual(expect.arrayContaining(["lemons.txt", "apples.txt", "oranges.txt"]));
    });
  });
});
