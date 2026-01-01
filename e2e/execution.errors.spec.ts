import test, { expect } from "@playwright/test";
import { mkdir } from "fs/promises";
import { describe } from "node:test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("execution | errors", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("shows an error when trying to decompress a directory", async ({ page }) => {
    // given
    const dir = FilesystemBoundary.SCRATCH_PAD.join("mydir");
    await mkdir(dir);
    // when
    await EditorFlow.createPipeline(page, {
      name: "Decompression Error",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          fileOrFolder: dir,
        },
        {
          previousId: "A",
          id: "B",
          type: "Decompression",
        },
      ],
    });
    await ExecutionFlow.executePipeline(page, { expectedOutcome: "error" });
    // then
    const error = `ExecutionError::artifact_type_invalid {
      "name": "mydir",
      "type": "directory"
    }`;
    await expect(page.getByText(error)).toBeVisible();
  });

  test("shows an error when trying to decrypt a corrupted file", async ({ page }) => {
    // given
    const dir = FilesystemBoundary.SCRATCH_PAD.join("mydir");
    await mkdir(dir);
    // when
    await EditorFlow.createPipeline(page, {
      name: "Decompression Error",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          fileOrFolder: dir,
        },
        {
          previousId: "A",
          id: "B",
          type: "Decompression",
        },
      ],
    });
    await ExecutionFlow.executePipeline(page, { expectedOutcome: "error" });
    // then
    const error = `ExecutionError::artifact_type_invalid {
      "name": "mydir",
      "type": "directory"
    }`;
    await expect(page.getByText(error)).toBeVisible();
  });

  test("shows an error when script execution fails", async ({ page }) => {
    // given
    const script = FilesystemBoundary.SCRATCH_PAD.join("script.sh");
    await Common.writeScript(script).withContents(`
      #!/bin/bash
      echo "Thriving in STDOUT ..."
      echo "... but suffering in STDERR" >&2
      exit 1
    `);
    // when
    await EditorFlow.createPipeline(page, {
      name: "Encryption Error",
      steps: [
        {
          id: "A",
          type: "Custom Script",
          path: script,
        },
      ],
    });
    await ExecutionFlow.executePipeline(page, { expectedOutcome: "error" });
    // then
    const error = `ExecutionError::nonzero_script_exit (1)

      Thriving in STDOUT ...
      ... but suffering in STDERR
    `;
    await expect(page.getByText(error)).toBeVisible();
  });
});
