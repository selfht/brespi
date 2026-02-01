import { describe, expect, it } from "bun:test";
import { basename, join } from "path";
import { TestUtils } from "../TestUtils.test";

describe("REGRESSION > configuration", async () => {
  type TestCase = {
    filename: string;
    json: any;
  };
  async function readConfigurationJsons(folder: string): Promise<TestCase[]> {
    const glob = new Bun.Glob("*.json");
    const files = await Array.fromAsync(glob.scan({ cwd: folder, absolute: true }));
    return await Promise.all(
      [...files].map<Promise<TestCase>>(async (file) => ({
        filename: basename(file),
        json: await Bun.file(file).json(),
      })),
    );
  }

  const suitePath = join(import.meta.dir, "configurations");
  const configurationJsons = await readConfigurationJsons(suitePath);
  if (configurationJsons.length === 0) {
    throw new Error(`Couldn't find configuration JSONs: ${suitePath}`);
  }

  const collection = TestUtils.createCollection("filename", configurationJsons);
  it.each(collection.testCases)("%s", (testCase) => {
    const { json } = collection.get(testCase);
    console.log(json);
  });
});
