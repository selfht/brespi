import test, { expect } from "@playwright/test";
import { describe } from "node:test";
import { EditorFlow } from "./flows/EditorFlow";
import path, { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { mkdir } from "fs/promises";
import { ExecutionFlow } from "./flows/ExecutionFlow";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { Common } from "./common/Common";

describe("execution | errors", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("shows an error when trying to encrypt a directory", async ({ page }) => {
    // given
    const dir = path.join(FilesystemBoundary.SCRATCH_PAD, "mydir");
    await mkdir(dir);
    // when
    await EditorFlow.createPipeline(page, {
      name: "Encryption Error",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          fileOrFolder: dir,
        },
        {
          previousId: "A",
          id: "B",
          type: "Encryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
      ],
    });
    await ExecutionFlow.executePipeline(page, { expectedOutcome: "error" });
    // then
    const error = `Execution::artifact_type_invalid {
      "name": "mydir",
      "type": "directory"
    }`;
    await expect(page.getByText(error)).toBeVisible();
  });

  test("shows an error when script execution fails", async ({ page }) => {
    // given
    const script = join(FilesystemBoundary.SCRATCH_PAD, "script.sh");
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
    const error = `Execution::Script::nonzero_exit {
      "exitCode": 1,
      "stdall": "Thriving in STDOUT ...\\n... but suffering in STDERR\\n"
    }`;
    await expect(page.getByText(error)).toBeVisible();
  });
});
