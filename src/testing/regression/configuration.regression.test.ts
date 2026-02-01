import { Configuration } from "@/models/Configuration";
import { describe, it } from "bun:test";
import { TestUtils } from "../TestUtils.test";
import { utils } from "./utils.regression.test";

describe("REGRESSION > configuration", async () => {
  const collection = TestUtils.createCollection("filename", await utils.readConfigurationJsons());
  it.each(collection.testCases)("%s", (testCase) => {
    // given
    const { filename, json } = collection.get(testCase);
    // when
    Configuration.Core.parse(json);
    // then (no errors)
  });
});
