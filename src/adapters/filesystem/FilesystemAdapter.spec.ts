import { Generate } from "@/helpers/Generate";
import { Test } from "@/helpers/Test.spec";
import { Step } from "@/models/Step";
import { beforeEach, describe, expect, it } from "bun:test";
import { readdir } from "fs/promises";
import { join } from "path";
import { FilesystemAdapter } from "./FilesystemAdapter";

describe(FilesystemAdapter.name, async () => {
  const { managedStorageCapability, filterCapability, resetAllMocks } = await Test.initializeMockRegistry();
  const adapter = new FilesystemAdapter(await Test.env(), Test.impl(managedStorageCapability), Test.impl(filterCapability));

  const { scratchpad, cleanScratchpad } = await Test.getScratchpad();
  beforeEach(async () => {
    resetAllMocks();
    await cleanScratchpad();
    await Test.cleanArtifacts();
  });

  it("writes files to a directory", async () => {
    // given
    const artifacts = await Test.createArtifacts("f:Apple.txt", "f:Banana.txt", "f:Coconut.txt");
    const folderPath = join(scratchpad, "storage");
    // when
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: null,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath,
      managedStorage: false,
    };
    await adapter.write(artifacts, step, []);
    // then
    const storage = await readdir(folderPath);
    expect(storage).toHaveLength(3);
    expect(storage).toEqual(expect.arrayContaining(["Apple.txt", "Banana.txt", "Coconut.txt"]));
  });

  it("writes folders to a directory", async () => {
    // given
    const artifacts = await Test.createArtifacts("d:Set", "d:List", "d:Group");
    const folderPath = join(scratchpad, "storage");
    // when
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: null,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath,
      managedStorage: false,
    };
    await adapter.write(artifacts, step, []);
    // then
    const storage = await readdir(folderPath);
    expect(storage).toHaveLength(3);
    expect(storage).toEqual(expect.arrayContaining(["Set", "List", "Group"]));
  });

  const collection = Test.createCollection<{ storageMethod: "normal" | "managed" }>("storageMethod", [
    { storageMethod: "normal" },
    { storageMethod: "managed" },
  ]);
  it.each(collection.testCases)("merges (and overwrites) with an existing folder when writing artifacts: method=%s", (testCase) => {
    const { storageMethod } = collection.get(testCase);
    throw new Error(storageMethod);
  });
});
