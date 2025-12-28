import test, { expect, Page } from "@playwright/test";
import { readdir } from "fs/promises";
import { describe } from "node:test";
import path from "path";
import { FileSystemBoundary } from "./boundaries/FileSystemBoundary";
import { PostgresBoundary } from "./boundaries/PostgresBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | postgres", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("performs backups of `musicworld`, `bakingworld` and `gamingworld`", async ({ page }) => {
    // given
    const backupDir = path.join(FileSystemBoundary.SCRATCH_PAD, "backups");
    expect(await S3Boundary.listBucket()).toHaveLength(0);
    // when
    await createBackupPipeline(page, { backupDir });
    await ExecutionFlow.executeCurrentPipeline(page);
    // then
    expect(await readdir(backupDir)).toHaveLength(3);
    expect(await readdir(backupDir)).toEqual(expect.arrayContaining(["musicworld.dump", "bakingworld.dump", "gamingworld.dump"]));
  });

  test("performs a backup and restore of `gamingworld`", async ({ page }) => {
    // given
    const database = "gamingworld";
    const backupDir = path.join(FileSystemBoundary.SCRATCH_PAD, "backups");
    const initialData = await PostgresBoundary.queryAll({ database, table: "games" });
    // when (perform a backup)
    await createBackupPipeline(page, { backupDir });
    await ExecutionFlow.executeCurrentPipeline(page);
    // when (delete some records)
    const idsToDelete = initialData.map(({ id }) => id as number).filter((_id, index) => index % 2 === 0);
    await PostgresBoundary.execute({
      database,
      sql: `delete from games where id in (${idsToDelete.join(", ")})`,
    });
    const dataAfterDeletion = await PostgresBoundary.queryAll({ database, table: "games" });
    expect(initialData).not.toEqual(dataAfterDeletion);
    // when (perform a restore)
    await createRestorePipeline(page, { backupDir, database });
    await ExecutionFlow.executeCurrentPipeline(page);
    // then
    const dataAfterRestore = await PostgresBoundary.queryAll({ database, table: "games" });
    expect(initialData).toEqual(dataAfterRestore);
  });

  type BackupOptions = {
    backupDir: string;
  };
  async function createBackupPipeline(page: Page, { backupDir }: BackupOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Postgres Backup",
      steps: [
        {
          id: "A",
          type: "Postgres Backup",
          connectionReference: "MY_POSTGRES_URL",
        },
        {
          previousId: "A",
          id: "B",
          type: "Filesystem Write",
          path: backupDir,
        },
      ],
    });
  }

  type RestoreOptions = {
    backupDir: string;
    database: "musicworld" | "bakingworld" | "gamingworld";
  };
  async function createRestorePipeline(page: Page, { backupDir, database }: RestoreOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Postgres Restore",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: backupDir,
        },
        {
          previousId: "A",
          id: "B",
          type: "Folder Flatten",
        },
        {
          previousId: "B",
          id: "C",
          type: "Filter",
          selectionMethod: "glob",
          selectionNameGlob: `*${database}*`,
        },
        {
          previousId: "C",
          type: "Postgres Restore",
          database,
          connectionReference: "MY_POSTGRES_URL",
        },
      ],
    });
  }
});
