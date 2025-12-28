import test, { expect, Page } from "@playwright/test";
import { access, readFile, writeFile } from "fs/promises";
import { describe } from "node:test";
import { join } from "path";
import { FileSystemBoundary } from "./boundaries/FileSystemBoundary";
import { ResetBoundary } from "./boundaries/ResetBoundary";
import { EditorFlow } from "./flows/EditorFlow";
import { ExecutionFlow } from "./flows/ExecutionFlow";

describe("encrypt-and-compress", () => {
  test.beforeEach(async ({ request }) => {
    await ResetBoundary.reset({ request });
  });

  const destination = {
    originalTxtFile(env: "app" | "playwright") {
      const root = env === "app" ? FileSystemBoundary.SCRATCH_PAD_APP : FileSystemBoundary.SCRATCH_PAD_PLAYWRIGHT;
      return join(root, "original.txt");
    },
    forward(env: "app" | "playwright") {
      const root = env === "app" ? FileSystemBoundary.SCRATCH_PAD_APP : FileSystemBoundary.SCRATCH_PAD_PLAYWRIGHT;
      return join(root, "forward");
    },
    backward(env: "app" | "playwright") {
      const root = env === "app" ? FileSystemBoundary.SCRATCH_PAD_APP : FileSystemBoundary.SCRATCH_PAD_PLAYWRIGHT;
      return join(root, "backward");
    },
  };
  test("compression and encryption are reversible", async ({ page }) => {
    // given
    const originalTxtFilePath = destination.originalTxtFile("playwright");
    await writeFile(originalTxtFilePath, "Hello World, this is my original file!");

    // when (compress and encrypt)
    await createCompressionAndEncryptionPipeline(page);
    await ExecutionFlow.executeCurrentPipeline(page);
    // then (expect a scratch file to have been created, with different contents)
    const encryptedFilePath = join(destination.forward("playwright"), "original.txt.tar.gz.enc");
    expect(await readFile(encryptedFilePath)).not.toEqual(await readFile(originalTxtFilePath));

    // when (decrypt and decompress)
    await createDecryptionAndDecompressionPipeline(page);
    await ExecutionFlow.executeCurrentPipeline(page);
    // then (expect a scratch file to have been created, with the same contents)
    const decryptedFilePath = join(destination.backward("playwright"), "original.txt");
    expect(await readFile(decryptedFilePath)).toEqual(await readFile(originalTxtFilePath));
  });

  async function createCompressionAndEncryptionPipeline(page: Page) {
    await EditorFlow.createPipeline(page, {
      name: "Compress And Encrypt",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: destination.originalTxtFile("app"),
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
          path: destination.forward("app"),
        },
      ],
    });
  }

  async function createDecryptionAndDecompressionPipeline(page: Page) {
    await EditorFlow.createPipeline(page, {
      name: "Decrypt and Decompress",
      steps: [
        {
          id: "A",
          type: "Filesystem Read",
          path: destination.forward("app"),
        },
        {
          previousId: "A",
          id: "B",
          type: "Folder Flatten",
        },
        {
          previousId: "B",
          id: "C",
          type: "Decryption",
          keyReference: "MY_ENCRYPTION_KEY",
        },
        {
          previousId: "C",
          id: "D",
          type: "Decompression",
        },
        {
          previousId: "D",
          type: "Filesystem Write",
          path: destination.backward("app"),
        },
      ],
    });
  }

  function fileExists(path: string): Promise<boolean> {
    return access(path).then(
      () => true,
      () => false,
    );
  }
});
