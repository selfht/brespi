import { Env } from "@/Env";
import { describe, expect, it } from "bun:test";
import { initializeSqlite } from "./sqlite";

describe("sqlite", () => {
  it("successfully applies all migrations", async () => {
    // given
    const env = { X_BRESPI_DATABASE: ":memory:" } as Env.Private;
    // when
    const sqlite = await initializeSqlite(env);
    // then (no errors)
    expect(sqlite).toBeDefined(); // no errors
  });
});
