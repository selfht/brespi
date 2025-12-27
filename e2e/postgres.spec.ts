import test, { Page } from "@playwright/test";
import { describe } from "node:test";
import { EditorFlow } from "./flows/EditorFlow";
import { ResetFlow } from "./flows/ResetFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("postgres", () => {
  test.beforeEach(async ({ request }) => {
    await ResetFlow.reset({ request });
  });

  test("executes backups of `musicworld`, `bakingworld` and `gamingworld`", async ({ page }) => {
    // given
    await createBackupPipeline(page);
    // when
    await ExecutionFlow.executeCurrentPipeline(page, { expectedOutcome: "success" });
  });

  async function createBackupPipeline(page: Page) {
    await EditorFlow.createPipeline(page, {
      name: "Backup Pipeline",
      steps: [
        {
          id: "A",
          type: "Postgres Backup",
          connectionReference: "MY_POSTGRES_CONNECTION_URL",
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
          id: "D",
          type: "S3 Upload",
          bucket: "bucko",
          endpoint: "http://s3:4566",
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: "/backups",
        },
      ],
    });
  }

  async function createRestorePipeline(page: Page, database: "musicworld" | "bakingworld" | "gamingworld") {
    await EditorFlow.createPipeline(page, {
      name: "Restore Pipeline",
      steps: [
        {
          id: "A",
          type: "S3 Download",
          bucket: "bucko",
          endpoint: "http://s3:4566",
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: "/backups",
          selectionTarget: "latest",
        },
        {
          previousId: "A",
          id: "B",
          type: "Filter",
          selectionMethod: "glob",
          selectionNameGlob: `*${database}*`,
        },
        {
          previousId: "B",
          id: "C",
          type: "Decryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
        {
          previousId: "C",
          id: "D",
          type: "Decompression",
        },
        {
          previousId: "D",
          id: "E",
          type: "Postgres Restore",
          database,
          connectionReference: "MY_POSTGRES_CONNECTION_URL",
        },
      ],
    });
  }
});
