import test, { expect, Page } from "@playwright/test";
import { readdir } from "fs/promises";
import { dirname, join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { PipelineFlow } from "./flows/PipelineFlow";

const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");

test.beforeEach(async ({ request, page }) => {
  await ResetBoundary.reset(request);
  await page.goto("");
});

test("executes a transformer script which merges files", async ({ page }) => {
  // given
  const fileA = join(inputDir, "A.txt");
  await Common.writeFile(fileA, "This is line A\n");
  const fileB = join(inputDir, "B.txt");
  await Common.writeFile(fileB, "This is line B\n");
  const fileC = join(inputDir, "C.txt");
  await Common.writeFile(fileC, "This is line C\n");
  const script = FilesystemBoundary.SCRATCH_PAD.join("merge.sh");
  await Common.writeExecutableFile(script).withContents(`
      #!/bin/bash
      cat $BRESPI_ARTIFACTS_IN/* > $BRESPI_ARTIFACTS_OUT/ABC.txt
    `);
  // when
  await createPipeline(page, { scriptPath: script });
  await PipelineFlow.execute(page);
  // then
  expect(await readdir(outputDir)).toHaveLength(1);
  const mergedFileContents = await Common.readFile(join(outputDir, "ABC.txt"));
  expect(mergedFileContents).toEqual("This is line A\nThis is line B\nThis is line C\n");
});

test("executes with the 'passthrough' option active", async ({ page }) => {
  // given
  const fileA = join(inputDir, "A.txt");
  await Common.writeFile(fileA, "This is line A\n");
  const fileB = join(inputDir, "B.txt");
  await Common.writeFile(fileB, "This is line B\n");
  const script = FilesystemBoundary.SCRATCH_PAD.join("pass.sh");
  await Common.writeExecutableFile(script).withContents(`
      #!/bin/bash
      echo "I was here!" > evidence.txt
    `);
  // when
  await createPipeline(page, { scriptPath: script, passthrough: true });
  await PipelineFlow.execute(page);
  // then
  expect(await readdir(outputDir)).toHaveLength(2);
  expect(await readdir(outputDir)).toEqual(expect.arrayContaining(["A.txt", "B.txt"]));
  const evidenceFileRelativeToScript = join(dirname(script), "evidence.txt");
  expect(await Common.readFile(evidenceFileRelativeToScript)).toEqual("I was here!\n");
});

test("shows an error when script execution fails", async ({ page }) => {
  // given
  const script = FilesystemBoundary.SCRATCH_PAD.join("script.sh");
  await Common.writeExecutableFile(script).withContents(`
      #!/bin/bash
      echo "Thriving in STDOUT ..."
      echo "... but suffering in STDERR" >&2
      exit 1
    `);
  // when
  await PipelineFlow.create(page, {
    name: "Encryption Error",
    steps: [
      {
        id: "A",
        type: "Custom Script",
        path: script,
      },
    ],
  });
  await PipelineFlow.execute(page, { expectedOutcome: "error" });
  // then
  const error = `ExecutionError::nonzero_script_exit

      Thriving in STDOUT ...
      ... but suffering in STDERR

      (exit 1)
    `;
  await expect(page.getByText(error)).toBeVisible();
});

type Options = {
  scriptPath: string;
  passthrough?: boolean;
};
async function createPipeline(page: Page, { scriptPath, passthrough = false }: Options) {
  return await PipelineFlow.create(page, {
    name: "Custom Script",
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
        type: "Custom Script",
        path: scriptPath,
        passthrough: passthrough ? "true" : "false",
      },
      {
        previousId: "C",
        type: "Filesystem Write",
        folder: outputDir,
      },
    ],
  });
}
