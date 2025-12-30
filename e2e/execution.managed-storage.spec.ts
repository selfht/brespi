import test, { expect, Page } from "@playwright/test";
import { mkdir, readdir, readFile } from "fs/promises";
import { describe } from "node:test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | managed-storage", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("s3", async ({ page }) => {
    const storageFolder = "my-backups";
    await performStorageTest({
      page,
      listStorageEntries: S3Boundary.listBucket,
      storage: {
        writeStep: {
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          endpoint: S3Boundary.ENDPOINT,
          region: S3Boundary.REGION,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: storageFolder,
        },
        readStep: {
          type: "S3 Download",
          bucket: S3Boundary.BUCKET,
          endpoint: S3Boundary.ENDPOINT,
          region: S3Boundary.REGION,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: storageFolder,
          managedStorageSelectionTarget: "latest",
        },
      },
    });
  });

  test("filesystem", async ({ page }) => {
    const storageFolder = join(FilesystemBoundary.SCRATCH_PAD, "storage", "my-backups");
    await mkdir(storageFolder, { recursive: true });
    await performStorageTest({
      page,
      listStorageEntries: () => FilesystemBoundary.listFlattenedFolderEntries(storageFolder),
      storage: {
        writeStep: {
          type: "Filesystem Write",
          folder: storageFolder,
          managedStorage: "true",
        },
        readStep: {
          type: "Filesystem Read",
          fileOrFolder: storageFolder,
          managedStorage: "true",
          managedStorageSelectionTarget: "latest",
        },
      },
    });
  });

  type Options = {
    page: Page;
    listStorageEntries: () => Promise<string[]>;
    storage: {
      writeStep: EditorFlow.StepOptions;
      readStep: EditorFlow.StepOptions;
    };
  };
  async function performStorageTest({ page, listStorageEntries, storage }: Options) {
    // given
    const inputDir = join(FilesystemBoundary.SCRATCH_PAD, "input");
    const outputDir = join(FilesystemBoundary.SCRATCH_PAD, "output");
    expect(await listStorageEntries()).toHaveLength(0);

    // when (write files)
    const fruits = ["Apple", "Banana", "Coconut"];
    for (const fruit of fruits) {
      const path = join(inputDir, `${fruit}.txt`);
      await Common.writeFileRecursive(path, `My name is ${fruit}`);
    }
    // when (backup to storage)
    const writePipelineId = await createWritePipeline(page, { inputDir, writeStep: storage.writeStep });
    await ExecutionFlow.executePipeline(page);
    // then (storage has records)
    const firstStorageSnapshot = await listStorageEntries();
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
    const readPipelineId = await createReadPipeline(page, { readStep: storage.readStep, outputDir });
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
    const secondStorageSnapshot = await listStorageEntries();
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
  }

  type WritePipelineOptions = {
    inputDir: string;
    writeStep: EditorFlow.StepOptions;
  };
  async function createWritePipeline(page: Page, { inputDir, writeStep }: WritePipelineOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Storage Write",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          fileOrFolder: inputDir,
        },
        {
          previousId: "A",
          id: "B",
          type: "Folder Flatten",
        },
        {
          ...writeStep,
          previousId: "B",
        },
      ],
    });
  }

  type ReadPipelineOptions = {
    readStep: EditorFlow.StepOptions;
    outputDir: string;
  };
  async function createReadPipeline(page: Page, { readStep, outputDir }: ReadPipelineOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Storage Read",
      steps: [
        {
          ...readStep,
          id: "A",
        },
        {
          previousId: "A",
          id: "B",
          type: "Filesystem Write",
          folder: outputDir,
        },
      ],
    });
  }
});
