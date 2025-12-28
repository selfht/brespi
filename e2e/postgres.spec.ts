import test, { expect, Page } from "@playwright/test";
import { describe } from "node:test";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";
import { PostgresBoundary } from "./boundaries/PostgresBoundary";

describe("postgres", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("performs backups of `musicworld`, `bakingworld` and `gamingworld`", async ({ page }) => {
    // given
    expect(await S3Boundary.listBucket()).toHaveLength(0);
    // when
    await createBackupPipeline(page);
    await ExecutionFlow.executeCurrentPipeline(page);
    // then
    expect(await S3Boundary.listBucket()).toEqual(
      expect.arrayContaining([
        expect.stringContaining("musicworld.dump.tar.gz.enc"),
        expect.stringContaining("bakingworld.dump.tar.gz.enc"),
        expect.stringContaining("gamingworld.dump.tar.gz.enc"),
      ]),
    );
  });

  test("performs a backup and restore of `gamingworld`", async ({ page }) => {
    const database = "gamingworld";
    // given
    const dataInitial = await PostgresBoundary.query({ database, table: "games" });
    // when (perform a backup)
    await createBackupPipeline(page);
    await ExecutionFlow.executeCurrentPipeline(page);
    // when (delete some records)
    await PostgresBoundary.multiDelete({
      database,
      table: "games",
      ids: dataInitial.map(({ id }) => id).filter((_id, index) => index % 2 === 0),
    });
    const dataAfterDeletion = await PostgresBoundary.query({ database, table: "games" });
    expect(dataInitial).not.toEqual(dataAfterDeletion);
    // when (perform a restore)
    await createRestorePipeline(page, database);
    await ExecutionFlow.executeCurrentPipeline(page);
    // then
    const dataAfterRestore = await PostgresBoundary.query({ database, table: "games" });
    expect(dataInitial).toEqual(dataAfterRestore);
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
          type: "S3 Upload",
          bucket: S3Boundary.Config.BUCKET,
          endpoint: S3Boundary.Config.ENDPOINT_APP,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: S3Boundary.Config.BASE_FOLDER,
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
          bucket: S3Boundary.Config.BUCKET,
          endpoint: S3Boundary.Config.ENDPOINT_APP,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: S3Boundary.Config.BASE_FOLDER,
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
          type: "Postgres Restore",
          database,
          connectionReference: "MY_POSTGRES_CONNECTION_URL",
        },
      ],
    });
  }
});
