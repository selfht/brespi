import test, { expect, Page } from "@playwright/test";
import { readdir, readFile } from "fs/promises";
import { describe } from "node:test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | filesystem", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("writes and reads artifacts to/from a chosen storage folder", async ({ page }) => {
    // given
    const inputDir = join(FilesystemBoundary.SCRATCH_PAD, "input");
    const outputDir = join(FilesystemBoundary.SCRATCH_PAD, "output");
    const storageFolder = join(FilesystemBoundary.SCRATCH_PAD, "storage");

    // when (write files)
    const fruits = ["Apple", "Banana", "Coconut"];
    for (const fruit of fruits) {
      const path = join(inputDir, `${fruit}.txt`);
      await Common.writeFileRecursive(path, `My name is ${fruit}`);
    }
    // when (backup to storage)
    const writePipelineId = await createFilesystemWritePipeline(page, { inputDir, storageFolder });
    await ExecutionFlow.executePipeline(page);
    // then (storage has records)
    const firstStorageSnapshot = await listFlattenedFolderEntries(storageFolder);
    expect(firstStorageSnapshot).toHaveLength(5);
    expect(firstStorageSnapshot).toEqual(
      expect.arrayContaining([
        expect.stringContaining("__brespi_manifest__.json"),
        expect.stringMatching(/__brespi_artifact_index_\w+__.json/),
        expect.stringContaining("Apple.txt"),
        expect.stringContaining("Banana.txt"),
        expect.stringContaining("Coconut.txt"),
      ]),
    );

    // when (retrieve latest from storage)
    const readPipelineId = await createFilesystemReadPipeline(page, { storageFolder, outputDir });
    await ExecutionFlow.executePipeline(page);
    // then (retrieved records are identical)
    expect(await readdir(outputDir)).toHaveLength(fruits.length);
    for (const fruit of fruits) {
      const retrievedContents = await readFile(join(outputDir, `${fruit}.txt`));
      const originalContents = await readFile(join(inputDir, `${fruit}.txt`));
      expect(retrievedContents).toEqual(originalContents);
    }

    // when (write different files)
    await Common.emptyDir(inputDir);
    await Common.emptyDir(outputDir);
    const vegetables = ["Daikon", "Eggplant"];
    for (const vegetable of vegetables) {
      const path = join(inputDir, `${vegetable}.txt`);
      await Common.writeFileRecursive(path, `I am a warrior named ${vegetable}`);
    }
    // when (backup to storage)
    await ExecutionFlow.executePipeline(page, { id: writePipelineId });
    // then (storage has more records)
    const secondStorageSnapshot = await listFlattenedFolderEntries(storageFolder);
    expect(secondStorageSnapshot).toHaveLength(8);
    expect(secondStorageSnapshot).toEqual(
      expect.arrayContaining([
        expect.stringContaining("__brespi_manifest__.json"),
        expect.stringMatching(/__brespi_artifact_index_\w+__.json/),
        expect.stringContaining("Apple.txt"),
        expect.stringContaining("Banana.txt"),
        expect.stringContaining("Coconut.txt"),
        expect.stringMatching(/__brespi_artifact_index_\w+__.json/),
        expect.stringContaining("Daikon.txt"),
        expect.stringContaining("Eggplant.txt"),
      ]),
    );

    // when (retrieve latest from storage again)
    await ExecutionFlow.executePipeline(page, { id: readPipelineId });
    // then (retrieved records are identical)
    expect(await readdir(outputDir)).toHaveLength(vegetables.length);
    for (const vegetable of vegetables) {
      const retrievedContents = await readFile(join(outputDir, `${vegetable}.txt`));
      const originalContents = await readFile(join(inputDir, `${vegetable}.txt`));
      expect(retrievedContents).toEqual(originalContents);
    }
  });

  type FilesystemWritePipeline = {
    inputDir: string;
    storageFolder: string;
  };
  async function createFilesystemWritePipeline(page: Page, { inputDir, storageFolder }: FilesystemWritePipeline) {
    return await EditorFlow.createPipeline(page, {
      name: "Filesystem Write",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: inputDir,
        },
        {
          previousId: "A",
          id: "B",
          type: "Folder Flatten",
        },
        {
          previousId: "B",
          type: "Filesystem Write",
          path: storageFolder,
          brespiManaged: "true",
        },
      ],
    });
  }

  type FilesystemReadPipeline = {
    storageFolder: string;
    outputDir: string;
  };
  async function createFilesystemReadPipeline(page: Page, { storageFolder, outputDir }: FilesystemReadPipeline) {
    return await EditorFlow.createPipeline(page, {
      name: "Filesystem Read",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: storageFolder,
          brespiManaged: "true",
          brespiManagedSelectionTarget: "latest",
        },
        {
          previousId: "A",
          id: "B",
          type: "Filesystem Write",
          path: outputDir,
        },
      ],
    });
  }

  async function listFlattenedFolderEntries(folder: string): Promise<string[]> {
    const results: string[] = [];
    async function recurse(currentPath: string, relativePath: string = "") {
      const entries = await readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryRelativePath = relativePath ? join(relativePath, entry.name) : entry.name;
        if (entry.isFile()) {
          results.push(entryRelativePath);
        } else if (entry.isDirectory()) {
          await recurse(join(currentPath, entry.name), entryRelativePath);
        }
      }
    }
    await recurse(folder);
    return results;
  }
});
