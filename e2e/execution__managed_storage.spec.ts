import test, { expect, Page } from "@playwright/test";
import { mkdir, readdir, readFile } from "fs/promises";
import { describe } from "node:test";
import { dirname, join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | managed_storage", () => {
  const namespace = "my-backups";

  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("s3", async ({ page }) => {
    await performStorageTest({
      page,
      listStorageEntries: S3Boundary.listBucket,
      storage: {
        writeStep: {
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: namespace,
        },
        readStep: {
          type: "S3 Download",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: namespace,
          managedStorageSelectionTarget: "latest",
        },
      },
    });
  });

  test("filesystem", async ({ page }) => {
    const storageFolder = FilesystemBoundary.SCRATCH_PAD.join("storage", namespace);
    await mkdir(storageFolder, { recursive: true });
    await performStorageTest({
      page,
      listStorageEntries: () => FilesystemBoundary.listFlattenedFolderEntries(dirname(storageFolder)),
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
    const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
    const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");
    expect(await listStorageEntries()).toHaveLength(0);

    // when (write files)
    const fruits = ["Apple", "Banana", "Coconut"];
    for (const fruit of fruits) {
      const path = join(inputDir, `${fruit}.txt`);
      await Common.writeFile(path, `My name is ${fruit}`);
    }
    // when (backup to storage)
    const writePipelineId = await createWritePipeline(page, { inputDir, writeStep: storage.writeStep });
    await ExecutionFlow.executePipeline(page);
    // then (storage has records)
    const firstStorageSnapshot = await listStorageEntries();
    expect(firstStorageSnapshot).toHaveLength(5);
    expect(firstStorageSnapshot).toEqual(
      expect.arrayContaining([
        expect.stringMatching(new RegExp(`^${namespace}/__brespi_manifest__\.json$`)),
        expect.stringMatching(
          new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/__brespi_artifact_index_${Common.Regex.RANDOM}__\.json$`),
        ),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Apple.txt`)),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Banana.txt`)),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Coconut.txt`)),
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
    await Common.emptyDirectory(inputDir);
    await Common.emptyDirectory(outputDir);
    const vegetables = ["Daikon", "Eggplant"];
    for (const vegetable of vegetables) {
      const path = join(inputDir, `${vegetable}.txt`);
      await Common.writeFile(path, `I am a warrior named ${vegetable}`);
    }
    // when (backup to storage)
    await ExecutionFlow.executePipeline(page, { id: writePipelineId });
    // then (storage has more records)
    const secondStorageSnapshot = await listStorageEntries();
    expect(secondStorageSnapshot).toHaveLength(8);
    expect(secondStorageSnapshot).toEqual(
      expect.arrayContaining([
        expect.stringMatching(new RegExp(`^${namespace}/__brespi_manifest__\.json$`)),
        expect.stringMatching(
          new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/__brespi_artifact_index_${Common.Regex.RANDOM}__\.json$`),
        ),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Apple.txt`)),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Banana.txt`)),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Coconut.txt`)),
        expect.stringMatching(
          new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/__brespi_artifact_index_${Common.Regex.RANDOM}__\.json$`),
        ),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Daikon.txt`)),
        expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Eggplant.txt`)),
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
