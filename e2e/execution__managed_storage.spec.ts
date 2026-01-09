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

  test("s3 happy flow", async ({ page }) => {
    await performHappyFlowTest({
      page,
      listStorageEntries: S3Boundary.listBucket,
      pipelineStep: {
        write: {
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: namespace,
        },
        read: {
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

  test("s3 error flow : corrupt manifest during write", async ({ page }) => {
    await performCorruptManifestWriteTest({
      page,
      listStorageEntries: S3Boundary.listBucket,
      writeStorageEntry: ({ path, content }) => S3Boundary.writeBucket(path, content),
      pipelineStep: {
        write: {
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: namespace,
        },
      },
    });
  });

  test("filesystem happy flow", async ({ page }) => {
    const storageFolder = FilesystemBoundary.SCRATCH_PAD.join("storage", namespace);
    await mkdir(storageFolder, { recursive: true });
    await performHappyFlowTest({
      page,
      listStorageEntries: () => FilesystemBoundary.listFlattenedFolderEntries(dirname(storageFolder)),
      pipelineStep: {
        write: {
          type: "Filesystem Write",
          folder: storageFolder,
          managedStorage: "true",
        },
        read: {
          type: "Filesystem Read",
          path: storageFolder,
          managedStorage: "true",
          managedStorageSelectionTarget: "latest",
        },
      },
    });
  });

  test("filesystem error flow : corrupt manifest during write", async ({ page }) => {
    const storageFolder = FilesystemBoundary.SCRATCH_PAD.join("storage");
    await performCorruptManifestWriteTest({
      page,
      listStorageEntries: () => FilesystemBoundary.listFlattenedFolderEntries(storageFolder),
      writeStorageEntry: ({ path, content }) => Common.writeFile(join(storageFolder, path), content),
      pipelineStep: {
        write: {
          type: "Filesystem Write",
          folder: join(storageFolder, namespace),
          managedStorage: "true",
        },
      },
    });
  });

  type HappyFlowOptions = {
    page: Page;
    listStorageEntries: () => Promise<string[]>;
    pipelineStep: {
      write: EditorFlow.StepOptions;
      read: EditorFlow.StepOptions;
    };
  };
  async function performHappyFlowTest({ page, listStorageEntries, pipelineStep }: HappyFlowOptions) {
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
    const writePipelineId = await createWritePipeline(page, { inputDir, writeStep: pipelineStep.write });
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
    const readPipelineId = await createReadPipeline(page, { readStep: pipelineStep.read, outputDir });
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

  type CorruptManifestWriteOptions = {
    page: Page;
    listStorageEntries: () => Promise<string[]>;
    writeStorageEntry: (opts: { path: string; content: string }) => Promise<void>;
    pipelineStep: {
      write: EditorFlow.StepOptions;
    };
  };
  async function performCorruptManifestWriteTest({
    page,
    listStorageEntries,
    writeStorageEntry,
    pipelineStep: pipelineStep,
  }: CorruptManifestWriteOptions) {
    // given
    await writeStorageEntry({ path: join(namespace, "__brespi_manifest__.json"), content: "this doesn't look like json!" });
    expect(await listStorageEntries()).toEqual([join(namespace, "__brespi_manifest__.json")]);

    // when
    await createWritePipeline(page, {
      inputDir: FilesystemBoundary.SCRATCH_PAD.join(),
      writeStep: pipelineStep.write,
    });
    await ExecutionFlow.executePipeline(page, { expectedOutcome: "error" });

    // then
    const error = `ExecutionError::managed_storage_corrupted {
      "element": "manifest"
    }`;
    await expect(page.getByText(error)).toBeVisible();
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
          path: inputDir,
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
