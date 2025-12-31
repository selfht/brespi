import { describe, expect, it } from "bun:test";
import { readdir } from "fs/promises";
import { join } from "path";
import { Exception } from "./Exception";

describe(Exception.name, async () => {
  const classes = await retrieveErrorClasses();

  it.each(classes)("maintains a 1:1 mapping between error keys and values", async (ErrorClass) => {
    // given
    const entries = Object.entries(ErrorClass).map(([key, value]) => ({ key, value }));
    const group = entries.find(({ key }) => key === Exception.Group)!.value as string;
    // when
    entries
      .filter(({ key }) => key !== Exception.Group)
      .forEach(({ key, value }) => {
        // then
        const error = (value as () => Exception)();
        expect(error.problem).toEqual(`${group}::${key}`);
      });
  });

  async function retrieveErrorClasses(): Promise<Exception.ClassWithGroup[]> {
    const errorDir = join(import.meta.dir, "..");
    const allFiles = await readdir(errorDir);
    const errorFiles = allFiles.filter((file) => file.endsWith("Error.ts")).map((file) => `../${file}`);
    const errorClasses: Exception.ClassWithGroup[] = [];
    for (const file of errorFiles) {
      const module = await import(file);
      // Extract all error classes from the module
      // For regular exports: { ClientError, ServerError, etc }
      // For namespace exports: { AdapterError: { S3, Filesystem, etc } }
      const extractErrorClasses = (obj: any): any[] => {
        const classes: any[] = [];
        for (const key in obj) {
          const value = obj[key];
          // Check if it's an error class (has GROUP property)
          // Classes can be typeof "function" or "object"
          if (value && Exception.Group in value) {
            classes.push(value);
          }
          // Check if it's a namespace containing error classes (and doesn't have GROUP)
          else if (value && typeof value === "object") {
            classes.push(...extractErrorClasses(value));
          }
        }
        return classes;
      };
      errorClasses.push(...extractErrorClasses(module));
    }
    return errorClasses;
  }
});
