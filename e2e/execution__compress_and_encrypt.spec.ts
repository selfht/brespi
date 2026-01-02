import test, { expect, Page } from "@playwright/test";
import { readFile, writeFile } from "fs/promises";
import { describe } from "node:test";
import { join } from "path";
import { FilesystemBoundary } from "./boundaries/FilesystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

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
    await createCompressionAndEncryptionPipeline(page);
    await ExecutionFlow.executePipeline(page);
    // then (expect a scratch file to have been created, with different contents)
    expect(await readFile(path.forwardProcessingFile)).not.toEqual(await readFile(path.originalFile));

    // when (decrypt and decompress)
    await createDecryptionAndDecompressionPipeline(page);
    await ExecutionFlow.executePipeline(page);
    // then (expect a scratch file to have been created, with the same contents)
    expect(await readFile(path.reverseProcessingFile)).toEqual(await readFile(path.originalFile));
  });

  async function createCompressionAndEncryptionPipeline(page: Page) {
    return await EditorFlow.createPipeline(page, {
      name: "Compress And Encrypt",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          fileOrFolder: path.originalFile,
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
  }

  async function createDecryptionAndDecompressionPipeline(page: Page) {
    return await EditorFlow.createPipeline(page, {
      name: "Decrypt and Decompress",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          fileOrFolder: path.forwardProcessingFile,
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
  }
});
