import { expect, test } from "@playwright/test";
import { describe } from "node:test";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { EditorFlow } from "./flows/EditorFlow";

describe("editor", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("creates a backup pipeline", async ({ page }) => {
    // given
    const pipeline: EditorFlow.CreatePipelineOptions = {
      name: "Typical Backup Pipeline",
      steps: [
        {
          id: "A",
          type: "Postgres Backup",
          connectionReference: "MY_POSTGRES_URL",
        },
        {
          previousId: "A",
          id: "B",
          type: "Compression",
        },
        {
          previousId: "B",
          id: "C",
          type: "Encryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
        {
          previousId: "C",
          type: "S3 Upload",
          bucket: S3Boundary.Config.BUCKET,
          endpoint: S3Boundary.Config.ENDPOINT_APP,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: S3Boundary.Config.BASE_FOLDER,
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
