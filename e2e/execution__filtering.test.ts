import { Step } from "@/models/Step";
import test, { expect, Page } from "@playwright/test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

type TestCase = {
  artifacts: string[];
  filterCriteria: Step.FilterCriteria;
  expectedArtifacts: string[];
};

const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");

test.beforeEach(async ({ request }) => {
  await ResetBoundary.reset({ request });
});

test("standalone filter step ::: method exact", async ({ page }) => {
  await performFilterTest({
    page,
    createPipelineFn: createStandaloneFilterPipeline,
    testCase: {
      artifacts: ["red.txt", "white.txt", "blue.txt"],
      filterCriteria: {
        method: "exact",
        name: "blue.txt",
      },
      expectedArtifacts: ["blue.txt"].sort(),
    },
  });
});

test("filesystem step w/ filter ::: method glob", async ({ page }) => {
  await performFilterTest({
    page,
    createPipelineFn: createFilesystemReadFilterPipeline,
    testCase: {
      artifacts: ["unit-test.ts", "test-case.ts", "integration.ts", "pretest.ts", "production.ts"],
      filterCriteria: {
        method: "glob",
        nameGlob: "*test*",
      },
      expectedArtifacts: ["unit-test.ts", "test-case.ts", "pretest.ts"].sort(),
    },
  });
});

test("s3 step w/ filter ::: method regex", async ({ page }) => {
  await performFilterTest({
    page,
    createPipelineFn: createS3DownloadFilterPipeline,
    testCase: {
      artifacts: ["alpha01", "beta99", "alpha1", "gamma01", "beta123"],
      filterCriteria: {
        method: "regex",
        nameRegex: "^(alpha|beta)\\d{2}$",
      },
      expectedArtifacts: ["alpha01", "beta99"].sort(),
    },
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
    await Common.writeFile(path, `These are the contents for ${artifact}`);
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
        path: inputDir,
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
  const temporaryStorageFolder = FilesystemBoundary.SCRATCH_PAD.join("temporary-storage");
  return await EditorFlow.createPipeline(page, {
    name: "Filesystem Read Filter",
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
        id: "C",
        type: "Filesystem Write",
        folder: temporaryStorageFolder,
        managedStorage: "true",
      },
      {
        previousId: "C",
        id: "D",
        type: "Filesystem Read",
        path: temporaryStorageFolder,
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
        path: inputDir,
      },
      {
        previousId: "A",
        id: "B",
        type: "Folder Flatten",
      },
      {
        previousId: "B",
        id: "C",
        ...S3Boundary.connectionDefaults,
        type: "S3 Upload",
        baseFolder: "",
      },
      {
        previousId: "C",
        id: "D",
        ...S3Boundary.connectionDefaults,
        type: "S3 Download",
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
