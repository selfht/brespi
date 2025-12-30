import test, { expect, Page } from "@playwright/test";
import { readdir } from "fs/promises";
import { describe } from "node:test";
import path from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { PostgresBoundary } from "./boundaries/PostgresBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

enum Database {
  e2e_movies = "e2e_movies",
  e2e_travel = "e2e_travel",
}

describe("execution | postgres", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test.afterEach(async () => {
    for (const database of Object.values(Database)) {
      await PostgresBoundary.database({ operation: "drop", database });
    }
  });

  test("performs the backup of two databases", async ({ page }) => {
    // given
    const backupDir = path.join(FilesystemBoundary.SCRATCH_PAD, "backups");
    await PostgresBoundary.setup({
      database: Database.e2e_movies,
      tables: [
        {
          name: "films",
          initialRows: [
            { id: 1, title: "The Shawshank Redemption", director: "Frank Darabont", year: 1994, rating: 9 },
            { id: 2, title: "The Godfather", director: "Francis Ford Coppola", year: 1972, rating: 9 },
            { id: 3, title: "Inception", director: "Christopher Nolan", year: 2010, rating: 8 },
            { id: 4, title: "Pulp Fiction", director: "Quentin Tarantino", year: 1994, rating: 8 },
          ],
        },
        {
          name: "actors",
          initialRows: [
            { id: 1, name: "Morgan Freeman", film_id: 1, role: "Red", age: 86 },
            { id: 2, name: "Marlon Brando", film_id: 2, role: "Don Vito Corleone", age: 80 },
            { id: 3, name: "Leonardo DiCaprio", film_id: 3, role: "Cobb", age: 49 },
            { id: 4, name: "John Travolta", film_id: 4, role: "Vincent Vega", age: 70 },
            { id: 5, name: "Tim Robbins", film_id: 1, role: "Andy Dufresne", age: 65 },
          ],
        },
        {
          name: "reviews",
          initialRows: [
            { id: 1, film_id: 1, reviewer: "Roger Ebert", score: 10, comment: "A timeless masterpiece" },
            { id: 2, film_id: 2, reviewer: "Pauline Kael", score: 9, comment: "Brilliant storytelling" },
            { id: 3, film_id: 3, reviewer: "Peter Travers", score: 9, comment: "Mind-bending thriller" },
            { id: 4, film_id: 4, reviewer: "Gene Siskel", score: 8, comment: "Tarantino at his best" },
          ],
        },
      ],
    });
    await PostgresBoundary.setup({
      database: Database.e2e_travel,
      tables: [
        {
          name: "destinations",
          initialRows: [
            { id: 1, name: "Paris", country: "France", visitors_per_year: 19000000 },
            { id: 2, name: "Tokyo", country: "Japan", visitors_per_year: 15000000 },
            { id: 3, name: "New York", country: "USA", visitors_per_year: 13500000 },
            { id: 4, name: "Barcelona", country: "Spain", visitors_per_year: 9000000 },
            { id: 5, name: "Dubai", country: "UAE", visitors_per_year: 16700000 },
          ],
        },
        {
          name: "hotels",
          initialRows: [
            { id: 1, name: "Grand Hotel Paris", destination_id: 1, rating: 5, price_per_night: 450 },
            { id: 2, name: "Tokyo Inn", destination_id: 2, rating: 4, price_per_night: 220 },
            { id: 3, name: "NYC Plaza", destination_id: 3, rating: 5, price_per_night: 550 },
            { id: 4, name: "Barcelona Beach Resort", destination_id: 4, rating: 4, price_per_night: 180 },
          ],
        },
      ],
    });
    // when
    await createBackupPipeline(page, { backupDir, databases: Object.values(Database) });
    await ExecutionFlow.executePipeline(page);
    // then
    const expectedDumpFiles = Object.values(Database).map((db) => `${db}.dump`);
    expect(await readdir(backupDir)).toHaveLength(expectedDumpFiles.length);
    expect(await readdir(backupDir)).toEqual(expect.arrayContaining(expectedDumpFiles));
  });

  test("performs a backup and restore", async ({ page }) => {
    // given
    const database = Database.e2e_movies;
    await PostgresBoundary.setup({
      database,
      tables: [
        {
          name: "films",
          initialRows: [
            { id: 1, title: "The Dark Knight", director: "Christopher Nolan", year: 2008, rating: 9 },
            { id: 2, title: "Forrest Gump", director: "Robert Zemeckis", year: 1994, rating: 8 },
            { id: 3, title: "The Matrix", director: "Wachowski Sisters", year: 1999, rating: 8 },
          ],
        },
      ],
    });
    const backupDir = path.join(FilesystemBoundary.SCRATCH_PAD, "backups");
    const initialData = await PostgresBoundary.queryAll({ database, table: "films" });

    // when (perform a backup)
    await createBackupPipeline(page, { backupDir, databases: [database] });
    await ExecutionFlow.executePipeline(page);

    // when (modify records)
    await PostgresBoundary.execute({ database, sql: "delete from films where id = 2" });
    await PostgresBoundary.insert({
      database,
      table: "films",
      rows: [{ id: 4, title: "Fight Club", director: "David Fincher", year: 1999, rating: 8 }],
    });
    const dataAfterModification = await PostgresBoundary.queryAll({ database, table: "films" });
    expect(initialData).not.toEqual(dataAfterModification);

    // when (perform a restore)
    await createRestorePipeline(page, { backupDir, database });
    await ExecutionFlow.executePipeline(page);

    // then
    const dataAfterRestore = await PostgresBoundary.queryAll({ database, table: "films" });
    expect(initialData).toEqual(dataAfterRestore);
  });

  type BackupOptions = {
    backupDir: string;
    databases: string[];
  };
  async function createBackupPipeline(page: Page, { backupDir, databases }: BackupOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Postgres Backup",
      steps: [
        {
          id: "A",
          type: "Postgres Backup",
          connectionReference: "MY_POSTGRES_URL",
          databaseSelectionStrategy: "include",
          databaseSelectionInclude: databases.join(","),
        },
        {
          previousId: "A",
          id: "B",
          type: "Filesystem Write",
          folder: backupDir,
        },
      ],
    });
  }

  type RestoreOptions = {
    backupDir: string;
    database: string;
  };
  async function createRestorePipeline(page: Page, { backupDir, database }: RestoreOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Postgres Restore",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          fileOrFolder: backupDir,
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
          filterCriteriaMethod: "glob",
          filterCriteriaNameGlob: `*${database}*`,
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
