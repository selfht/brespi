import test, { expect, Page } from "@playwright/test";
import { readdir, readFile } from "fs/promises";
import { describe } from "node:test";
import { dirname, join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | custom_script", () => {
  const inputDir = FilesystemBoundary.SCRATCH_PAD.join("input");
  const outputDir = FilesystemBoundary.SCRATCH_PAD.join("output");

  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
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
    await ExecutionFlow.executePipeline(page);
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
    await ExecutionFlow.executePipeline(page);
    // then
    expect(await readdir(outputDir)).toHaveLength(2);
    expect(await readdir(outputDir)).toEqual(expect.arrayContaining(["A.txt", "B.txt"]));
    const evidenceFileRelativeToScript = join(dirname(script), "evidence.txt");
    expect(await Common.readFile(evidenceFileRelativeToScript)).toEqual("I was here!\n");
  });

  type Options = {
    scriptPath: string;
    passthrough?: boolean;
  };
  async function createPipeline(page: Page, { scriptPath, passthrough = false }: Options) {
    return await EditorFlow.createPipeline(page, {
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
});
