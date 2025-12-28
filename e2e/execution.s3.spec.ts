import test, { expect, Page } from "@playwright/test";
import { describe } from "node:test";
import { join } from "path";
import { FileSystemBoundary } from "./boundaries/FileSystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";
import { readdir } from "fs/promises";
import { readFile } from "fs/promises";

describe("execution | s3", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("writes and reads artifacts to/from a chosen bucket", async ({ page }) => {
    // given
    const baseFolder = "my-backups";
    const inputDir = join(FileSystemBoundary.SCRATCH_PAD, "input");
    const outputDir = join(FileSystemBoundary.SCRATCH_PAD, "output");
    expect(await S3Boundary.listBucket()).toHaveLength(0);

    // when (write files)
    const fruits = ["Apple", "Banana", "Coconut"];
    for (const fruit of fruits) {
      const path = join(inputDir, `${fruit}.txt`);
      await Common.writeFileRecursive(path, `My name is ${fruit}`);
    }
    // when (backup to S3)
    const writePipelineId = await createS3WritePipeline(page, { inputDir, baseFolder });
    await ExecutionFlow.executeCurrentPipeline(page);
    // then (S3 has records)
    expect(await S3Boundary.listBucket()).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Apple.txt"),
        expect.stringContaining("Banana.txt"),
        expect.stringContaining("Coconut.txt"),
      ]),
    );

    // when (retrieve latest from S3)
    const readPipelineId = await createS3ReadPipeline(page, { baseFolder, outputDir });
    await ExecutionFlow.executeCurrentPipeline(page);
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
    // when (backup to S3)
    await page.goto(`pipelines/${writePipelineId}`);
    await ExecutionFlow.executeCurrentPipeline(page);
    // then (S3 has more records)
    expect(await S3Boundary.listBucket()).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Apple.txt"),
        expect.stringContaining("Banana.txt"),
        expect.stringContaining("Coconut.txt"),
        expect.stringContaining("Daikon.txt"),
        expect.stringContaining("Eggplant.txt"),
      ]),
    );

    // when (retrieve latest from S3 again)
    await page.goto(`pipelines/${readPipelineId}`);
    await ExecutionFlow.executeCurrentPipeline(page);
    // then (retrieved records are identical)
    expect(await readdir(outputDir)).toHaveLength(vegetables.length);
    for (const vegetable of vegetables) {
      const retrievedContents = await readFile(join(outputDir, `${vegetable}.txt`));
      const originalContents = await readFile(join(inputDir, `${vegetable}.txt`));
      expect(retrievedContents).toEqual(originalContents);
    }
  });

  type S3WritePipeline = {
    inputDir: string;
    baseFolder: string;
  };
  async function createS3WritePipeline(page: Page, { inputDir, baseFolder }: S3WritePipeline) {
    return await EditorFlow.createPipeline(page, {
      name: "S3 Write",
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
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder,
        },
      ],
    });
  }

  type S3ReadPipeline = {
    baseFolder: string;
    outputDir: string;
  };
  async function createS3ReadPipeline(page: Page, { baseFolder, outputDir }: S3ReadPipeline) {
    return await EditorFlow.createPipeline(page, {
      name: "S3 Read",
      steps: [
        {
          id: "A",
          type: "S3 Download",
          bucket: S3Boundary.BUCKET,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder,
          selectionTarget: "latest",
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
});
