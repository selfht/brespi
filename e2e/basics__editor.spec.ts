import { expect, test } from "@playwright/test";
import { describe } from "node:test";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { EditorFlow } from "./flows/EditorFlow";

describe("basics | editor", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("creates and deletes a simple backup pipeline", async ({ page }) => {
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
          bucket: S3Boundary.BUCKET,
          endpoint: S3Boundary.ENDPOINT,
          region: S3Boundary.REGION,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: "my-base-folder",
        },
      ],
    };

    // when
    await EditorFlow.createPipeline(page, pipeline);
    await page.getByRole("link", { name: "Pipelines" }).click();
    // then (there's a pipeline on the main page)
    const pipelineLink = page.getByRole("link", { name: pipeline.name });
    await expect(pipelineLink).toBeVisible();
    // then (the configuration is out of sync)
    const outOfSyncLocator = page.getByTestId("conf-out-of-sync");
    await expect(outOfSyncLocator).toBeVisible();

    // when
    await pipelineLink.click();
    page.on("dialog", (dialog) => dialog.accept());
    await EditorFlow.deletePipeline(page);
    // then (we're on the homepage again)
    await expect(page).toHaveTitle("Pipelines | Brespi");
    expect(page.url()).toMatch(/\/pipelines$/);
    await expect(pipelineLink).not.toBeVisible();
    // then (the configuration is in sync again)
    await expect(outOfSyncLocator).not.toBeVisible();
  });
});
