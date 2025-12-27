import { expect, test } from "@playwright/test";
import { describe } from "node:test";
import { EditorFlow } from "./flows/EditorFlow";
import { ResetFlow } from "./flows/ResetFlow";

describe("editor", () => {
  test.beforeEach(async ({ request }) => {
    await ResetFlow.reset({ request });
  });

  test("creates a backup pipeline", async ({ page }) => {
    // given
    const pipeline: EditorFlow.CreatePipelineOptions = {
      name: "Playwright Backup Pipeline",
      steps: [
        {
          id: "A",
          type: "Postgres Backup",
          connectionReference: "MY_POSTGRES_CONNECTION_URL",
        },
        {
          id: "B",
          previousId: "A",
          type: "Compression",
        },
        {
          id: "C",
          previousId: "B",
          type: "Encryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
        {
          id: "D",
          previousId: "C",
          type: "S3 Upload",
          bucket: "bucko",
          endpoint: "http://s3:4566",
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: "/backups",
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
