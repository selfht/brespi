import { Step } from "@/models/Step";
import test, { expect, Page } from "@playwright/test";
import { describe } from "node:test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";
import { S3Boundary } from "./boundaries/S3Boundary";

describe("execution | filtering", () => {
  type TestCase = {
    artifacts: string[];
    filterCriteria: Step.FilterCriteria;
    expectedArtifacts: string[];
  };
  const testCase: Record<"exact" | "glob" | "regex", TestCase> = {
    exact: {
      artifacts: ["red.txt", "white.txt", "blue.txt"],
      filterCriteria: {
        method: "exact",
        name: "blue.txt",
      },
      expectedArtifacts: ["blue.txt"].sort(),
    },
    glob: {
      artifacts: ["unit-test.ts", "test-case.ts", "integration.ts", "pretest.ts", "production.ts"],
      filterCriteria: {
        method: "glob",
        nameGlob: "*test*",
      },
      expectedArtifacts: ["unit-test.ts", "test-case.ts", "pretest.ts"].sort(),
    },
    regex: {
      artifacts: ["alpha01", "beta99", "alpha1", "gamma01", "beta123"],
      filterCriteria: {
        method: "regex",
        nameRegex: "^(alpha|beta)\\d{2}$",
      },
      expectedArtifacts: ["alpha01", "beta99"].sort(),
    },
  };

  const inputDir = join(FilesystemBoundary.SCRATCH_PAD, "input");
  const outputDir = join(FilesystemBoundary.SCRATCH_PAD, "output");

  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  describe("standalone filter step", () => {
    const createPipelineFn = createStandaloneFilterPipeline;
    test("standalone : exact", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.exact });
    });
    test("standalone : glob", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.glob });
    });
    test("standalone : regex", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.regex });
    });
  });

  describe("filesystem step w/ filter", () => {
    const createPipelineFn = createFilesystemReadFilterPipeline;
    test("filesys : exact", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.exact });
    });
    test("filesys : glob", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.glob });
    });
    test("filesys : regex", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.regex });
    });
  });

  describe("s3 step w/ filter", () => {
    const createPipelineFn = createS3DownloadFilterPipeline;
    test("s3 : exact", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.exact });
    });
    test("s3 : glob", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.glob });
    });
    test("s3 : regex", async ({ page }) => {
      await performFilterTest({ page, createPipelineFn, testCase: testCase.regex });
    });
  });

  type Options = {
    page: Page;
    createPipelineFn: (page: Page, fc: Step.FilterCriteria) => Promise<unknown>;
    testCase: TestCase;
  };
  async function performFilterTest({ page, createPipelineFn, testCase }: Options) {
    // given
    for (const artifact of testCase.artifacts) {
      const path = join(inputDir, `${artifact}`);
      await Common.writeFileRecursive(path, `These are the contents for ${artifact}`);
    }
    // when
    await createPipelineFn(page, testCase.filterCriteria);
    await ExecutionFlow.executePipeline(page);
    // then
    const filteredArtifacts = await FilesystemBoundary.listFlattenedFolderEntries(outputDir);
    expect(filteredArtifacts.sort()).toEqual(testCase.expectedArtifacts);
  }

  type PipelineOptions = Step.FilterCriteria;

  async function createStandaloneFilterPipeline(page: Page, filterCriteria: PipelineOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Normal Filter",
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
          previousId: "B",
          id: "C",
          type: "Filter",
          filterCriteriaMethod: filterCriteria.method,
          filterCriteriaName: filterCriteria.method === "exact" ? filterCriteria.name : undefined,
          filterCriteriaNameGlob: filterCriteria.method === "glob" ? filterCriteria.nameGlob : undefined,
          filterCriteriaNameRegex: filterCriteria.method === "regex" ? filterCriteria.nameRegex : undefined,
        },
        {
          previousId: "C",
          type: "Filesystem Write",
          folder: outputDir,
        },
      ],
    });
  }

  async function createFilesystemReadFilterPipeline(page: Page, filterCriteria: PipelineOptions) {
    const temporaryStorageFolder = join(FilesystemBoundary.SCRATCH_PAD, "temporary-storage");
    return await EditorFlow.createPipeline(page, {
      name: "Filesystem Read Filter",
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
          previousId: "B",
          id: "C",
          type: "Filesystem Write",
          folder: temporaryStorageFolder,
          managedStorage: "true",
        },
        {
          previousId: "C",
          id: "D",
          type: "Filesystem Read",
          fileOrFolder: temporaryStorageFolder,
          managedStorage: "true",
          managedStorageSelectionTarget: "latest",
          filterCriteria: "true",
          filterCriteriaMethod: filterCriteria.method,
          filterCriteriaName: filterCriteria.method === "exact" ? filterCriteria.name : undefined,
          filterCriteriaNameGlob: filterCriteria.method === "glob" ? filterCriteria.nameGlob : undefined,
          filterCriteriaNameRegex: filterCriteria.method === "regex" ? filterCriteria.nameRegex : undefined,
        },
        {
          previousId: "D",
          type: "Filesystem Write",
          folder: outputDir,
        },
      ],
    });
  }

  async function createS3DownloadFilterPipeline(page: Page, filterCriteria: PipelineOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Filesystem Read Filter",
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
          previousId: "B",
          id: "C",
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: "",
        },
        {
          previousId: "C",
          id: "D",
          type: "S3 Download",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: "",
          managedStorageSelectionTarget: "latest",
          filterCriteria: "true",
          filterCriteriaMethod: filterCriteria.method,
          filterCriteriaName: filterCriteria.method === "exact" ? filterCriteria.name : undefined,
          filterCriteriaNameGlob: filterCriteria.method === "glob" ? filterCriteria.nameGlob : undefined,
          filterCriteriaNameRegex: filterCriteria.method === "regex" ? filterCriteria.nameRegex : undefined,
        },
        {
          previousId: "D",
          type: "Filesystem Write",
          folder: outputDir,
        },
      ],
    });
  }
});
