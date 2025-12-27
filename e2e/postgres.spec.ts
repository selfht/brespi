import test, { Page } from "@playwright/test";
import { describe } from "node:test";
import { EditorFlow } from "./flows/EditorFlow";
import { ResetFlow } from "./flows/ResetFlow";

describe("postgres", () => {
  test.beforeEach(async ({ request }) => {
    await ResetFlow.reset({ request });
  });

  test("performs backups of `musicworld`, `bakingworld` and `gamingworld`", () => {});

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
    });
  }

  async function createRestorePipeline(page: Page) {
    await EditorFlow.createPipeline(page, {
      name: "Restore Pipeline",
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
    });
  }
});
