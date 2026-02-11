import { Class } from "@/types/Class";
import { describe, expect, it } from "bun:test";
import { readdir } from "fs/promises";
import { join } from "path";
import { Exception } from "./Exception";

describe(Exception.name, async () => {
  for (const klass of await findErrorClassesInParentFolder()) {
    const nameProperty = "_NAME_" as const;
    it(`assigns a correct ${nameProperty} field to ${klass.name}`, () => {
      // given
      if (!(nameProperty in klass && typeof klass[nameProperty] === "string")) {
        throw new Error(`Missing static ${nameProperty} string property`);
      }
      // when
      const nameValue = klass[nameProperty];
      // then
      expect(nameValue).toEqual(klass.name);
    });

    it(`initializes the fields of ${klass.name}`, () => {
      // given
      const fields = Object.keys(klass);

      // when
      fields
        .filter((key) => key !== nameProperty)
        .forEach((field) => {
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
  }

  async function findErrorClassesInParentFolder() {
    const result: Class[] = [];
    const errorEntries = await readdir(join(import.meta.dir, ".."));
    for (const errorEntry of errorEntries) {
      const match = errorEntry.match(/(\w+Error)\.ts/);
      if (match) {
        const klassName = match[1];
        const klass = await import(join("..", klassName)).then((m) => m[klassName]);
        result.push(klass);
      }
    }
    expect(result.length).toBeGreaterThan(0);
    return result;
  }
});
