import { expect, test } from "@playwright/test";
import { describe } from "node:test";
import { basename, dirname, join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { S3Boundary } from "./boundaries/S3Boundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | branching", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("creates and executes a branched pipeline", async ({ page }) => {
    const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
    const outputDir = {
      filesystemA: FilesystemBoundary.SCRATCH_PAD.join("filesystemA"),
      filesystemB: FilesystemBoundary.SCRATCH_PAD.join("filesystemB"),
      bucketX: "bucketX",
      bucketY: "bucketY",
    };
    // given
    const snacks = ["Almond", "Baklava", "Croissant"];
    for (const snack of snacks) {
      const path = join(inputDir, `${snack}.txt`);
      await Common.writeFile(path, `This is ${snack}`);
    }
    // when
    await EditorFlow.createPipeline(page, {
      name: "Branching",
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
          // branch 1/4
          previousId: "B",
          type: "Filesystem Write",
          folder: outputDir.filesystemA,
          managedStorage: "true",
        },
        {
          // branch 2/4
          previousId: "B",
          type: "Filesystem Write",
          folder: outputDir.filesystemB,
          managedStorage: "true",
        },
        {
          // branch 3/4
          previousId: "B",
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: outputDir.bucketX,
        },
        {
          // branch 4/4
          previousId: "B",
          type: "S3 Upload",
          bucket: S3Boundary.BUCKET,
          region: S3Boundary.REGION,
          endpoint: S3Boundary.ENDPOINT,
          accessKeyReference: "MY_S3_ACCESS_KEY",
          secretKeyReference: "MY_S3_SECRET_KEY",
          baseFolder: outputDir.bucketY,
        },
      ],
    });
    await ExecutionFlow.executePipeline(page);
    // then
    const destinations = {
      filesystemA: await listParentDirectoryButOnlyShowOwnPaths(outputDir.filesystemA),
      filesystemB: await listParentDirectoryButOnlyShowOwnPaths(outputDir.filesystemB),
      bucketX: await S3Boundary.listBucket(outputDir.bucketX),
      bucketY: await S3Boundary.listBucket(outputDir.bucketY),
    };
    for (const [namespace, entries] of Object.entries(destinations)) {
      expect(entries).toEqual(
        expect.arrayContaining([
          expect.stringMatching(new RegExp(`^${namespace}/__brespi_manifest__\.json$`)),
          expect.stringMatching(
            new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/__brespi_artifact_index_${Common.Regex.RANDOM}__\.json$`),
          ),
          expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Almond.txt`)),
          expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Baklava.txt`)),
          expect.stringMatching(new RegExp(`^${namespace}/${Common.Regex.TIMESTAMP_FOLDER}/Croissant.txt`)),
        ]),
      );
    }
  });

  async function listParentDirectoryButOnlyShowOwnPaths(ownPath: string) {
    const entries = await FilesystemBoundary.listFlattenedFolderEntries(dirname(ownPath));
    return entries.filter((e) => e.startsWith(basename(ownPath)));
  }
});
