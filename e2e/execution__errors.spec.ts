import test, { expect } from "@playwright/test";
import { mkdir } from "fs/promises";
import { describe } from "node:test";
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
    const dir = FilesystemBoundary.SCRATCH_PAD.join("folderboy");
    await mkdir(dir);
    // when
    await EditorFlow.createPipeline(page, {
      name: "Decompression Error",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: dir,
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
      "name": "folderboy",
      "type": "directory",
      "requiredType": "file"
    }`;
    await expect(page.getByText(error)).toBeVisible();
  });

  test("shows an error when trying to decrypt a corrupted file", async ({ page }) => {
    // given
    const file = FilesystemBoundary.SCRATCH_PAD.join("file.txt");
    await Common.writeFile(file, "This is my file!");
    const corruptingScript = FilesystemBoundary.SCRATCH_PAD.join("corrupting.sh");
    await Common.writeExecutableFile(corruptingScript).withContents(`
      #!/bin/bash
      # Get the encrypted file (there's exactly 1 file)
      file=$(ls $BRESPI_ARTIFACTS_IN/*)
      # Remove first byte for corruption
      tail -c +2 "$file" > "$BRESPI_ARTIFACTS_OUT/$(basename "$file")"
    `);
    // when
    await EditorFlow.createPipeline(page, {
      name: "Decryption Error",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: file,
        },
        {
          previousId: "A",
          id: "B",
          type: "Encryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
        {
          previousId: "B",
          id: "C",
          type: "Custom Script",
          path: corruptingScript,
        },
        {
          previousId: "C",
          type: "Decryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
      ],
    });
    await ExecutionFlow.executePipeline(page, { expectedOutcome: "error" });
    // then
    const error = "ExecutionError::decryption_failed";
    await expect(page.getByText(error)).toBeVisible();
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
