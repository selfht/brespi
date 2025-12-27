import { expect, test } from "@playwright/test";
import { describe } from "node:test";
import { EditorFlow } from "./flows/EditorFlow";

describe("editor", () => {
  test("creates a backup pipeline", async ({ request, page }) => {
    // given
    await request.post("/api/restricted/delete-all-pipelines");
    const pipeline: EditorFlow.CreatePipelineOptions = {
      name: "Playwright Backup Pipeline",
      steps: [
        {
          id: "backup",
          type: "Postgres Backup",
          connectionReference: "MY_POSTGRES_CONNECTION_URL",
        },
        {
          id: "compress",
          type: "Compression",
          previousId: "backup",
        },
        {
          id: "encrypt",
          type: "Encryption",
          keyReference: "MY_ENCRYPTION_KEY",
          previousId: "compress",
        },
        {
          id: "upload",
          type: "S3 Upload",
          bucket: "bucko",
          endpoint: "http://s3:4566",
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: "/backups",
          previousId: "encrypt",
        },
      ],
    };
    // when
    await EditorFlow.createPipeline(page, pipeline);
    // then
    await page.getByRole("link", { name: "Pipelines" }).click();
    await expect(page.getByRole("link", { name: pipeline.name })).toBeVisible();
  });
});
