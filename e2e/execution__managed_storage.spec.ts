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

type AdapterConfig = {
  name: string;
  listStorageEntries: () => Promise<string[]>;
  writeStorageEntry: (path: string, content: string) => Promise<unknown>;
  pipelineStep: {
    write: EditorFlow.StepOptions;
    read: EditorFlow.StepOptions;
  };
  beforeHappyFlow?: () => Promise<void>;
};

describe("execution | managed_storage", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  const Constant = {
    namespace: "my-backups",
    manifestCorruptionError: `ExecutionError::managed_storage_corrupted {
        "descriptor": "manifest"
      }`,
    listingCorruptionError: `ExecutionError::managed_storage_corrupted {
        "descriptor": "listing"
      }`,
  };

  const createFilesystemConfig = (): AdapterConfig => {
    const storageFolder = FilesystemBoundary.SCRATCH_PAD.join("storage", Constant.namespace);
    return {
      name: "filesystem",
      listStorageEntries: () => FilesystemBoundary.listFlattenedFolderEntries(dirname(storageFolder)),
      writeStorageEntry: (path, content) => Common.writeFile(join(dirname(storageFolder), path), content),
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
      beforeHappyFlow: async () => {
        await mkdir(storageFolder, { recursive: true });
      },
    };
  };

  const createS3Config = (): AdapterConfig => ({
    name: "s3",
    listStorageEntries: S3Boundary.listBucket,
    writeStorageEntry: S3Boundary.writeBucket,
    pipelineStep: {
      write: {
        ...S3Boundary.connectionDefaults,
        type: "S3 Upload",
        baseFolder: Constant.namespace,
      },
      read: {
        ...S3Boundary.connectionDefaults,
        type: "S3 Download",
        baseFolder: Constant.namespace,
        managedStorageSelectionTarget: "latest",
      },
    },
  });

  for (const createAdapter of [createFilesystemConfig, createS3Config]) {
    const adapter = createAdapter();

    test(`${adapter.name} ::: happy flow`, async ({ page }) => {
      if (adapter.beforeHappyFlow) await adapter.beforeHappyFlow();
      await performHappyFlowTest({
        page,
        listStorageEntries: adapter.listStorageEntries,
        pipelineStep: adapter.pipelineStep,
      });
    });

    test(`${adapter.name} ::: fail on corrupt manifest during write`, async ({ page }) => {
      await performCorruptWriteTest({
        page,
        listStorageEntries: adapter.listStorageEntries,
        writeStorageEntry: adapter.writeStorageEntry,
        pipelineStep: { write: adapter.pipelineStep.write },
      });
    });

    test(`${adapter.name} ::: fail on corrupt manifest during read`, async ({ page }) => {
      await performCorruptManifestReadTest({
        page,
        listStorageEntries: adapter.listStorageEntries,
        writeStorageEntry: adapter.writeStorageEntry,
        pipelineStep: adapter.pipelineStep,
      });
    });

    test(`${adapter.name} ::: fail on corrupt listing during read`, async ({ page }) => {
      await performCorruptListingReadTest({
        page,
        listStorageEntries: adapter.listStorageEntries,
        writeStorageEntry: adapter.writeStorageEntry,
        pipelineStep: adapter.pipelineStep,
      });
    });
  }

  type HappyFlowOptions = {
    page: Page;
    listStorageEntries: () => Promise<string[]>;
    pipelineStep: {
      write: EditorFlow.StepOptions;
      read: EditorFlow.StepOptions;
    };
  };

  async function performHappyFlowTest({ page, listStorageEntries, pipelineStep }: HappyFlowOptions) {
    const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
    const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");
    expect(await listStorageEntries()).toHaveLength(0);

    const fruits = ["Apple", "Banana", "Coconut"];
    await writeTestFiles(inputDir, fruits, (name) => `My name is ${name}`);

    const writePipelineId = await createWritePipeline(page, { inputDir, writeStep: pipelineStep.write });
    await ExecutionFlow.executePipeline(page);
    await verifyStorageHasFiles(await listStorageEntries(), fruits, 1);

    const readPipelineId = await createReadPipeline(page, { readStep: pipelineStep.read, outputDir });
    await ExecutionFlow.executePipeline(page);
    await verifyRetrievedFilesMatch(inputDir, outputDir, fruits);

    await Common.emptyDirectory(inputDir);
    await Common.emptyDirectory(outputDir);
    const vegetables = ["Daikon", "Eggplant"];
    await writeTestFiles(inputDir, vegetables, (name) => `I am a warrior named ${name}`);

    await ExecutionFlow.executePipeline(page, { id: writePipelineId });
    await verifyStorageHasFiles(await listStorageEntries(), [...fruits, ...vegetables], 2);

    await ExecutionFlow.executePipeline(page, { id: readPipelineId });
    await verifyRetrievedFilesMatch(inputDir, outputDir, vegetables);
  }

  type ErrorFlowOptions = {
    page: Page;
    listStorageEntries: () => Promise<string[]>;
    writeStorageEntry: (path: string, content: string) => Promise<unknown>;
    pipelineStep: {
      write: EditorFlow.StepOptions;
      read?: EditorFlow.StepOptions;
    };
  };

  async function performCorruptWriteTest(options: ErrorFlowOptions) {
    await options.writeStorageEntry(join(Constant.namespace, "__brespi_manifest__.json"), "this doesn't look like json!");
    expect(await options.listStorageEntries()).toEqual([join(Constant.namespace, "__brespi_manifest__.json")]);

    await createWritePipeline(options.page, {
      inputDir: FilesystemBoundary.SCRATCH_PAD.join(),
      writeStep: options.pipelineStep.write,
    });
    await ExecutionFlow.executePipeline(options.page, { expectedOutcome: "error" });
    await expect(options.page.getByText(Constant.manifestCorruptionError)).toBeVisible();
  }

  async function performCorruptManifestReadTest(options: ErrorFlowOptions) {
    await setupStorageWithFiles(options);

    await options.writeStorageEntry(join(Constant.namespace, "__brespi_manifest__.json"), JSON.stringify({ iam: "corrupted" }));
    await createReadPipeline(options.page, {
      readStep: options.pipelineStep.read!,
      outputDir: FilesystemBoundary.SCRATCH_PAD.join(),
    });
    await ExecutionFlow.executePipeline(options.page, { expectedOutcome: "error" });
    await expect(options.page.getByText(Constant.manifestCorruptionError)).toBeVisible();
  }

  async function performCorruptListingReadTest(options: ErrorFlowOptions) {
    await setupStorageWithFiles(options);

    const entries = await options.listStorageEntries();
    const [listingPath] = entries.filter((p) => p.includes("__brespi_listing_"));
    expect(listingPath).toBeDefined();

    await options.writeStorageEntry(listingPath, "i am also corrupted");
    await createReadPipeline(options.page, {
      readStep: options.pipelineStep.read!,
      outputDir: FilesystemBoundary.SCRATCH_PAD.join(),
    });
    await ExecutionFlow.executePipeline(options.page, { expectedOutcome: "error" });
    await expect(options.page.getByText(Constant.listingCorruptionError)).toBeVisible();
  }

  async function writeTestFiles(dir: string, files: string[], contentFn: (name: string) => string) {
    for (const file of files) {
      await Common.writeFile(join(dir, `${file}.txt`), contentFn(file));
    }
  }

  async function verifyStorageHasFiles(entries: string[], fileNames: string[], expectedListingCount: number) {
    const manifestPattern = `^${Constant.namespace}/__brespi_manifest__\\.json$`;
    const listingPattern = `^${Constant.namespace}/${Common.Regex.TIMESTAMP_FOLDER}/__brespi_listing_${Common.Regex.RANDOM}__\\.json$`;
    const filePatterns = fileNames.map((f) => `^${Constant.namespace}/${Common.Regex.TIMESTAMP_FOLDER}/${f}.txt`);

    expect(entries).toHaveLength(1 + expectedListingCount + fileNames.length);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.stringMatching(new RegExp(manifestPattern)),
        ...Array(expectedListingCount)
          .fill(null)
          .map(() => expect.stringMatching(new RegExp(listingPattern))),
        ...filePatterns.map((p) => expect.stringMatching(new RegExp(p))),
      ]),
    );
  }

  async function verifyRetrievedFilesMatch(inputDir: string, outputDir: string, fileNames: string[]) {
    expect(await readdir(outputDir)).toHaveLength(fileNames.length);
    for (const file of fileNames) {
      const retrieved = await readFile(join(outputDir, `${file}.txt`));
      const original = await readFile(join(inputDir, `${file}.txt`));
      expect(retrieved).toEqual(original);
    }
  }

  async function setupStorageWithFiles({ page, listStorageEntries, pipelineStep }: ErrorFlowOptions) {
    const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
    const testFiles = ["Apple", "Banana", "Coconut"];

    for (const fruit of testFiles) {
      await Common.writeFile(join(inputDir, `${fruit}.txt`), `My name is ${fruit}`);
    }

    await createWritePipeline(page, { inputDir, writeStep: pipelineStep.write });
    await ExecutionFlow.executePipeline(page);

    const entries = await listStorageEntries();
    expect(entries).toEqual(expect.arrayContaining(testFiles.map((f) => expect.stringContaining(`${f}.txt`))));

    return { inputDir, testFiles };
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
