import { Configuration } from "@/models/Configuration";
import { describe, expect, it } from "bun:test";
import { TestUtils } from "../TestUtils.test";
import { RegressionSuite } from "./RegressionSuite";

describe("regression", () => {
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
    const database = await RegressionSuite.Database.getRegressionDatabaseCopy();
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
});
