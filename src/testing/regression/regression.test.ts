import { Configuration } from "@/models/Configuration";
import { describe, expect, it } from "bun:test";
import { TestUtils } from "../TestUtils.test";
import { regressionSuiteManagement } from "./regressionSuiteManagement.test";

describe("regression", () => {
  describe("configuration parsing", async () => {
    const collection = TestUtils.createCollection("filename", await regressionSuiteManagement.readConfigurationJsons());
    it.each(collection.testCases)("%s", (testCase) => {
      // given
      const { json } = collection.get(testCase);
      // when
      Configuration.Core.parse(json);
      // then (no errors)
    });
  });

  describe("database querying", async () => {
    const database = await regressionSuiteManagement.getRegressionDatabaseCopy();
    const collection = TestUtils.createCollection("tableName", regressionSuiteManagement.getTables());
    it.each(collection.testCases)("%s", async (testCase) => {
      // given
      const { table } = collection.get(testCase);
      // when
      const records = await database.select().from(table);
      // then
      expect(records.length).toBeGreaterThan(0);
    });
  });
});
