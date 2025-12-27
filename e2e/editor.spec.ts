import { test, expect } from "@playwright/test";
import { describe } from "node:test";

describe("editor", () => {
  test("create a backup pipeline", async ({ page }) => {
    // navigate to pipeline editor
    await page.goto("");
    await page.getByText("New Pipeline ...").click();
    // grab a canvas reference
    const canvas = page.getByTestId("canvas");
    // add step (postgres backup)
    await page.getByText("Postgres Backup").click();
    await page.getByLabel("Connection Reference").fill("MY_POSTGRES_CONNECTION_URL");
    await page.getByText("Add Step").click();
    const block = page.getByTestId("Postgres_Backup");
    // add step (compression)
    // await page.getByText("Compression", { exact: true }).click();
    // await page.getByText("Add Step").click();
    // // add step (encryption)
    // await page.getByText("Encryption").click();
    // await page.getByLabel("Key Reference").fill("MY_ENCRYPTION_KEY");
    // await page.getByText("Add Step").click();
  });
});
