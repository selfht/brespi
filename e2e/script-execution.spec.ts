import test, { expect, Page } from "@playwright/test";
import { chmod, mkdir, writeFile } from "fs/promises";
import { describe } from "node:test";
import { dirname, join } from "path";
import { FileSystemBoundary } from "./boundaries/FileSystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";
import { readFile } from "fs/promises";
import { readdir } from "fs/promises";

describe("script-execution", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("executes a transformer script which merges files", async ({ page }) => {
    const inputDir = join(FileSystemBoundary.SCRATCH_PAD, "input");
    const outputDir = join(FileSystemBoundary.SCRATCH_PAD, "output");
    // given
    const fileA = join(inputDir, "A.txt");
    await writeFileRecursive(fileA, "This is line A\n");
    const fileB = join(inputDir, "B.txt");
    await writeFileRecursive(fileB, "This is line B\n");
    const fileC = join(inputDir, "C.txt");
    await writeFileRecursive(fileC, "This is line C\n");
    const script = join(FileSystemBoundary.SCRATCH_PAD, "merge.sh");
    await writeScript(script).withContents(`
#!/bin/bash
cat $BRESPI_ARTIFACTS_IN/* > $BRESPI_ARTIFACTS_OUT/ABC.txt
      `);
    // when
    await createScriptExecutionPipeline(page, {
      inputDir,
      outputDir,
      scriptPath: script,
    });
    await ExecutionFlow.executeCurrentPipeline(page);
    // then
    expect(await readdir(outputDir)).toHaveLength(1);
    const mergedFileContents = await readFile(join(outputDir, "ABC.txt"), { encoding: "utf-8" });
    expect(mergedFileContents).toEqual("This is line A\nThis is line B\nThis is line C\n");
  });

  async function writeFileRecursive(path: string, contents: string) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }

  function writeScript(path: string) {
    return {
      async withContents(contents: string) {
        await writeFileRecursive(path, contents.trim());
        await chmod(path, 0o755);
      },
    };
  }

  type PipelineOptions = {
    inputDir: string;
    outputDir: string;
    scriptPath: string;
  };
  async function createScriptExecutionPipeline(page: Page, { inputDir, outputDir, scriptPath }: PipelineOptions) {
    await EditorFlow.createPipeline(page, {
      name: "Script Execution",
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
          type: "Script Execution",
          path: scriptPath,
        },
        {
          previousId: "C",
          type: "Filesystem Write",
          path: outputDir,
        },
      ],
    });
  }
});
