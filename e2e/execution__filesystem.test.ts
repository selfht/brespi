import { describe } from "node:test";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import test from "@playwright/test";

describe("execution | filesystem", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });
});
