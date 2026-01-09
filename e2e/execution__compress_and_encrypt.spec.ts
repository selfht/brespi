import test, { expect, Page } from "@playwright/test";
import { readFile, writeFile } from "fs/promises";
import { describe } from "node:test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";
import { mkdir } from "fs/promises";
import { Common } from "./common/Common";

describe("execution | compress_and_encrypt", () => {
  const path = {
    originalFile: FilesystemBoundary.SCRATCH_PAD.join("original.txt"),
    forwardProcessingDir: FilesystemBoundary.SCRATCH_PAD.join("forward"),
    get forwardProcessingFile() {
      return join(this.forwardProcessingDir, "original.txt.tar.gz.enc");
    },
    reverseProcessingDir: FilesystemBoundary.SCRATCH_PAD.join("backward"),
    get reverseProcessingFile() {
      return join(this.reverseProcessingDir, "original.txt");
    },
  };

  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  test("compression and encryption are reversible", async ({ page }) => {
    // given
    await writeFile(path.originalFile, "Hello World, this is my original file!");

    // when (compress and encrypt)
    await EditorFlow.createPipeline(page, {
      name: "Compress And Encrypt",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: path.originalFile,
        },
        {
          previousId: "A",
          id: "B",
          type: "Compression",
        },
        {
          previousId: "B",
          id: "C",
          type: "Encryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
        {
          previousId: "C",
          type: "Filesystem Write",
          folder: path.forwardProcessingDir,
        },
      ],
    });
    await ExecutionFlow.executePipeline(page);
    // then (expect a scratch file to have been created, with different contents)
    expect(await readFile(path.forwardProcessingFile)).not.toEqual(await readFile(path.originalFile));

    // when (decrypt and decompress)
    await EditorFlow.createPipeline(page, {
      name: "Decrypt and Decompress",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: path.forwardProcessingFile,
        },
        {
          previousId: "A",
          id: "B",
          type: "Decryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
        {
          previousId: "B",
          id: "C",
          type: "Decompression",
        },
        {
          previousId: "C",
          type: "Filesystem Write",
          folder: path.reverseProcessingDir,
        },
      ],
    });
    await ExecutionFlow.executePipeline(page);
    // then (expect a scratch file to have been created, with the same contents)
    expect(await readFile(path.reverseProcessingFile)).toEqual(await readFile(path.originalFile));
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
          passthrough: "false",
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
});
