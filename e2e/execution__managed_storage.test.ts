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

  type PerformHappyFlowTest = {
    page: Page;
    listStorageEntries: () => Promise<string[]>;
    pipelineStep: {
      write: EditorFlow.StepOptions;
      read: EditorFlow.StepOptions;
    };
  };
  async function performHappyFlowTest({ page, listStorageEntries, pipelineStep }: PerformHappyFlowTest) {
    // given
    const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
    const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");
    expect(await listStorageEntries()).toHaveLength(0);
    const fruits = ["Apple.txt", "Banana.txt", "Coconut.txt"];
    await writeTestFiles(inputDir, fruits, (name) => `My name is ${name}`);

    // when (write to managed storage; first time)
    const writePipelineId = await createWritePipeline(page, { inputDir, writeStep: pipelineStep.write });
    await ExecutionFlow.executePipeline(page);
    // then (artifacts are stored)
    await verifyStorage({
      entries: await listStorageEntries(),
      expectedFilenames: fruits,
      expectedListingCount: 1,
    });

    // when (retrieving these artifacts)
    const readPipelineId = await createReadPipeline(page, { readStep: pipelineStep.read, outputDir });
    await ExecutionFlow.executePipeline(page);
    // then (we get the exact same files back)
    const firstRetrieval = await verifyIdenticalFolderContent({ inputDir, outputDir });
    expect(firstRetrieval.toSorted()).toEqual(fruits.toSorted());

    // when (write to managed storage; second time)
    await Common.emptyDirectory(inputDir);
    await Common.emptyDirectory(outputDir);
    const vegetables = ["Daikon.txt", "Eggplant.txt"];
    await writeTestFiles(inputDir, vegetables, (name) => `I am a warrior named ${name}`);
    // then (new artifacts are stored as well)
    await ExecutionFlow.executePipeline(page, { id: writePipelineId });
    await verifyStorage({
      entries: await listStorageEntries(),
      expectedFilenames: [...fruits, ...vegetables],
      expectedListingCount: 2,
    });

    // when (retrieving the latest version)
    await ExecutionFlow.executePipeline(page, { id: readPipelineId });
    // then (the latest artifacts are retrieved)
    const secondRetrieval = await verifyIdenticalFolderContent({ inputDir, outputDir });
    expect(secondRetrieval.toSorted()).toEqual(vegetables.toSorted());
  }

  type PerformErrorFlowTest = {
    page: Page;
    listStorageEntries: () => Promise<string[]>;
    writeStorageEntry: (path: string, content: string) => Promise<unknown>;
    pipelineStep: {
      write: EditorFlow.StepOptions;
      read?: EditorFlow.StepOptions;
    };
  };

  async function performCorruptWriteTest(options: PerformErrorFlowTest) {
    await options.writeStorageEntry(join(Constant.namespace, "__brespi_manifest__.json"), "this doesn't look like json!");
    expect(await options.listStorageEntries()).toEqual([join(Constant.namespace, "__brespi_manifest__.json")]);

    await createWritePipeline(options.page, {
      inputDir: FilesystemBoundary.SCRATCH_PAD.join(),
      writeStep: options.pipelineStep.write,
    });
    await ExecutionFlow.executePipeline(options.page, { expectedOutcome: "error" });
    await expect(options.page.getByText(Constant.manifestCorruptionError)).toBeVisible();
  }

  async function performCorruptManifestReadTest(options: PerformErrorFlowTest) {
    await setupStorageWithFiles(options);

    await options.writeStorageEntry(join(Constant.namespace, "__brespi_manifest__.json"), JSON.stringify({ iam: "corrupted" }));
    await createReadPipeline(options.page, {
      readStep: options.pipelineStep.read!,
      outputDir: FilesystemBoundary.SCRATCH_PAD.join(),
    });
    await ExecutionFlow.executePipeline(options.page, { expectedOutcome: "error" });
    await expect(options.page.getByText(Constant.manifestCorruptionError)).toBeVisible();
  }

  async function performCorruptListingReadTest(options: PerformErrorFlowTest) {
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
      await Common.writeFile(join(dir, file), contentFn(file));
    }
  }

  type VerifyStorage = {
    entries: string[];
    expectedFilenames: string[];
    expectedListingCount: number;
  };
  async function verifyStorage({ entries, expectedFilenames, expectedListingCount }: VerifyStorage) {
    const expectation = {
      manifest: {
        count: 1,
        pattern: `^${Constant.namespace}/__brespi_manifest__\\.json$`,
      },
      listings: {
        count: expectedListingCount,
        pattern: `^${Constant.namespace}/${Common.Regex.TIMESTAMP}/__brespi_listing_${Common.Regex.RANDOM}__\\.json$`,
      },
      artifacts: {
        count: expectedFilenames.length,
        pattern: (filename: string) => `^${Constant.namespace}/${Common.Regex.TIMESTAMP}/${filename}`,
      },
    };
    expect(entries).toHaveLength(expectation.manifest.count + expectation.listings.count + expectation.artifacts.count);
    Object.entries(expectation).forEach(([_, { count, pattern }]) => {
      if (typeof pattern === "string") {
        const matches = entries.filter((entry) => entry.match(new RegExp(pattern)));
        expect(matches).toHaveLength(count);
      } else {
        let matchCount = 0;
        expectedFilenames.forEach((f) => {
          const matches = entries.filter((entry) => entry.match(new RegExp(pattern(f))));
          expect(matches).toHaveLength(1);
          matchCount++;
        });
        expect(matchCount).toEqual(count);
      }
    });
  }

  type VerifyIdenticalFolderContent = {
    inputDir: string;
    outputDir: string;
  };
  async function verifyIdenticalFolderContent({ inputDir, outputDir }: VerifyIdenticalFolderContent): Promise<string[]> {
    const outputEntries = await readdir(outputDir);
    const inputEntries = await readdir(inputDir);
    expect(outputEntries.toSorted()).toEqual(inputEntries.toSorted());
    for (const entry of outputEntries) {
      const outputFile = await readFile(join(outputDir, entry));
      const inputFile = await readFile(join(inputDir, entry));
      expect(outputFile).toEqual(inputFile);
    }
    return outputEntries;
  }

  async function setupStorageWithFiles({ page, listStorageEntries, pipelineStep }: PerformErrorFlowTest) {
    const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
    const testFiles = ["Apple.txt", "Banana.txt", "Coconut.txt"];

    for (const testFile of testFiles) {
      await Common.writeFile(join(inputDir, testFile), `My name is ${testFile}`);
    }

    await createWritePipeline(page, { inputDir, writeStep: pipelineStep.write });
    await ExecutionFlow.executePipeline(page);

    const entries = await listStorageEntries();
    expect(entries).toEqual(expect.arrayContaining(testFiles.map((f) => expect.stringContaining(f))));

    return { inputDir, testFiles };
  }

  type CreateWritePipeline = {
    inputDir: string;
    writeStep: EditorFlow.StepOptions;
  };
  async function createWritePipeline(page: Page, { inputDir, writeStep }: CreateWritePipeline) {
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

  type CreateReadPipeline = {
    readStep: EditorFlow.StepOptions;
    outputDir: string;
  };
  async function createReadPipeline(page: Page, { readStep, outputDir }: CreateReadPipeline) {
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
