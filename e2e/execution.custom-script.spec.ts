import test, { expect, Page } from "@playwright/test";
import { readdir, readFile } from "fs/promises";
import { describe } from "node:test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | custom-script", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("executes a transformer script which merges files", async ({ page }) => {
    const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
    const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");
    // given
    const fileA = join(inputDir, "A.txt");
    await Common.writeFileRecursive(fileA, "This is line A\n");
    const fileB = join(inputDir, "B.txt");
    await Common.writeFileRecursive(fileB, "This is line B\n");
    const fileC = join(inputDir, "C.txt");
    await Common.writeFileRecursive(fileC, "This is line C\n");
    const script = FilesystemBoundary.SCRATCH_PAD.join("merge.sh");
    await Common.writeScript(script).withContents(`
      #!/bin/bash
      cat $BRESPI_ARTIFACTS_IN/* > $BRESPI_ARTIFACTS_OUT/ABC.txt
    `);
    // when
    await createScriptExecutionPipeline(page, {
      inputDir,
      outputDir,
      scriptPath: script,
    });
    await ExecutionFlow.executePipeline(page);
    // then
    expect(await readdir(outputDir)).toHaveLength(1);
    const mergedFileContents = await Common.readFileUtf8(join(outputDir, "ABC.txt"));
    expect(mergedFileContents).toEqual("This is line A\nThis is line B\nThis is line C\n");
  });

  type PipelineOptions = {
    inputDir: string;
    outputDir: string;
    scriptPath: string;
  };
  async function createScriptExecutionPipeline(page: Page, { inputDir, outputDir, scriptPath }: PipelineOptions) {
    return await EditorFlow.createPipeline(page, {
      name: "Custom Script",
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
          type: "Custom Script",
          path: scriptPath,
        },
        {
          previousId: "C",
          type: "Filesystem Write",
          folder: outputDir,
        },
      ],
    });
  }
});
