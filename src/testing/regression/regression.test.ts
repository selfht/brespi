import { Configuration } from "@/models/Configuration";
import { describe, expect, it } from "bun:test";
import { TestUtils } from "../TestUtils.test";
import { RegressionSuiteManagement } from "./RegressionSuiteManagement";

describe("regression", () => {
  describe("configuration parsing", async () => {
    const collection = TestUtils.createCollection("filename", await RegressionSuiteManagement.readConfigurationJsons());
    it.each(collection.testCases)("%s", (testCase) => {
      // given
      const { json } = collection.get(testCase);
      // when
      Configuration.Core.parse(json);
      // then (no errors)
    });
  });

  describe("database querying", async () => {
    const database = await RegressionSuiteManagement.getRegressionDatabaseCopy();
    const collection = TestUtils.createCollection("tableName", RegressionSuiteManagement.getTables());
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
