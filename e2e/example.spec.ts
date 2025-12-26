import { test, expect } from "@playwright/test";

test("get started link", async ({ page }) => {
  await page.goto("http://localhost:3000");
});
