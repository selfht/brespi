import { Class } from "@/types/Class";
import { beforeEach, describe, expect, it } from "bun:test";
import { readdir } from "fs/promises";
import { join } from "path";
import { Exception } from "./Exception";
import { Test } from "@/testing/Test.test";

describe(Exception.name, async () => {
  const collection = Test.createCollection("name", await findErrorClassesInParentFolder());
  it.each(collection.testCases)("initializes the fields of %s", (testCase) => {
    const { klass } = collection.get(testCase);
    // given
    const fields = Object.keys(klass);

    // when
    fields.forEach((field) => {
      const exceptionFn = (klass as any)[field] as Exception.Fn;
      expect(exceptionFn).toBeDefined();
      const exception = exceptionFn();

      // then
      expect(exception).toEqual(
        expect.objectContaining({
          problem: `${klass.name}::${field}`,
        }),
      );
    });
  });

  async function findErrorClassesInParentFolder() {
    const result: Array<{ klass: Class; name: string }> = [];
    const errorEntries = await readdir(join(import.meta.dir, ".."));
    for (const errorEntry of errorEntries) {
      const match = errorEntry.match(/(\w+Error)\.ts/);
      if (match) {
        const klassName = match[1];
        const klass = await import(join("..", klassName)).then((m) => m[klassName]);
        result.push({ klass, name: klass.name });
      }
    }
    expect(result.length).toBeGreaterThan(0);
    return result;
  }
});
