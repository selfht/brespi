import { describe, expect, it } from "bun:test";
import { join } from "path";

describe("REGRESSION > database", async () => {
  const databasePath = join(import.meta.dir, "databases", "db.sqlite");
  if (!(await Bun.file(databasePath).exists())) {
    throw new Error(`Regression database not found: ${databasePath}`);
  }
  it("example database test 2", () => {
    expect(1 + 1).toEqual(2);
  });
});
