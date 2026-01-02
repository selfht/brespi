import { Generate } from "@/helpers/Generate";
import { Test } from "@/helpers/Test.spec";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { beforeEach, describe, expect, it } from "bun:test";
import { readdir, rm } from "fs/promises";
import { join } from "path";
import { FilesystemAdapter } from "./FilesystemAdapter";

describe(FilesystemAdapter.name, async () => {
  const { managedStorageCapability, filterCapability, resetAllMocks } = await Test.initializeMockRegistry();
  const adapter = new FilesystemAdapter(await Test.env(), Test.impl(managedStorageCapability), Test.impl(filterCapability));

  const scratchpad = await Test.scratchpad();
  const scratchpadCleanup = async () => {
    await rm(scratchpad.unitTest, { force: true, recursive: true });
  };

  beforeEach(async () => {
    resetAllMocks();
    await scratchpadCleanup();
  });

  it("writes files to a directory", async () => {
    // given
    const artifacts = await createFileArtifacts("Apple", "Banana", "Coconut");
    // when
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: null,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath: join(scratchpad.application, "storage"),
      managedStorage: false,
    };
    await adapter.write(artifacts, step, []);
    // then
    const storage = await readdir(join(scratchpad.unitTest, "storage"));
    expect(storage).toHaveLength(3);
    expect(storage).toEqual(expect.arrayContaining(["Apple.txt", "Banana.txt", "Coconut.txt"]));
  });

  it("writes folders to a directory", async () => {
    // given
    const artifacts = await createFolderArtifacts("Set", "List", "Group");
    // when
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: null,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath: join(scratchpad.application, "storage"),
      managedStorage: false,
    };
    await adapter.write(artifacts, step, []);
    // then
    const storage = await readdir(join(scratchpad.unitTest, "storage"));
    expect(storage).toHaveLength(3);
    expect(storage).toEqual(expect.arrayContaining(["Set", "List", "Group"]));
  });

  async function createFileArtifacts(...files: string[]): Promise<Artifact[]> {
    const result: Artifact[] = [];
    for (const file of files) {
      const name = `${file}.txt`;
      await Bun.write(join(scratchpad.unitTest, "tmp", name), `Content: ${file}`);
      result.push({
        id: Generate.shortRandomString(),
        type: "file",
        name,
        path: join(scratchpad.application, "tmp", name),
      });
    }
    return result;
  }

  async function createFolderArtifacts(...folders: string[]): Promise<Artifact[]> {
    const result: Artifact[] = [];
    for (const folder of folders) {
      await Bun.write(join(scratchpad.unitTest, "tmp", folder, "index"), `<index>`);
      result.push({
        id: Generate.shortRandomString(),
        type: "directory",
        name: folder,
        path: join(scratchpad.application, "tmp", folder),
      });
    }
    return result;
  }
});
