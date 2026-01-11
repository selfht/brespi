import { Generate } from "@/helpers/Generate";
import { Test } from "@/helpers/Test.spec";
import { Step } from "@/models/Step";
import { beforeEach, describe, expect, it } from "bun:test";
import { readdir } from "fs/promises";
import { join } from "path";
import { FilesystemAdapter } from "./FilesystemAdapter";
import { ManagedStorageCapability } from "@/capabilities/ManagedStorageCapability";
import { FilterCapability } from "@/capabilities/FilterCapability";

describe(FilesystemAdapter.name, async () => {
  const { scratchpad } = await Test.getScratchpad();
  const adapter = new FilesystemAdapter(await Test.buildEnv(), new ManagedStorageCapability(), new FilterCapability());

  beforeEach(async () => {
    await Test.cleanup();
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
      retention: null,
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
      retention: null,
    };
    await adapter.write(artifacts, step, []);
    // then
    const storage = await readdir(folderPath);
    expect(storage).toHaveLength(3);
    expect(storage).toEqual(expect.arrayContaining(["Set", "List", "Group"]));
  });

  it("merges and partially overwrites with an existing folder when writing artifacts (normal storage)", async () => {
    const { scratchpad } = await Test.getScratchpad();
    const secret = `${Math.round(Math.random() * Math.pow(10, 9))}`;

    // given
    const destinationDir = join(scratchpad, "destination");
    const originalFiles = ["Nathan-Norris.txt", "Otto-Override.txt", "Peter-Parker.txt"];
    for (const file of originalFiles) {
      await Bun.write(join(destinationDir, file), secret);
    }

    // when
    const artifacts = await Test.createArtifacts("f:Otto-Override.txt");
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: null,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath: destinationDir,
      managedStorage: false,
      retention: null,
    };
    await adapter.write(artifacts, step, []);

    // then
    const entries = (await readdir(destinationDir)).sort();
    expect(entries).toEqual(originalFiles);
    for (const entry of entries) {
      const contents = await Bun.file(join(destinationDir, entry)).text();
      if (entry === "Otto-Override.txt") {
        expect(contents).not.toEqual(secret);
      } else {
        expect(contents).toEqual(secret);
      }
    }
  });

  it("merges with an existing folder when writing artifacts (managed storage)", async () => {
    const { scratchpad } = await Test.getScratchpad();
    const secret = `${Math.round(Math.random() * Math.pow(10, 9))}`;

    // given
    const destinationDir = join(scratchpad, "destination");
    const existingFile = Bun.file(join(destinationDir, "index.html"));
    await existingFile.write(secret);

    // when
    const artifacts = await Test.createArtifacts("f:irrelevant.txt");
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: null,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath: destinationDir,
      managedStorage: true,
      retention: null,
    };
    await adapter.write(artifacts, step, []);

    // then
    const entries = (await readdir(destinationDir)).sort();
    expect(entries).toEqual(expect.arrayContaining(["__brespi_manifest__.json", "index.html"]));
    expect(await existingFile.text()).toEqual(secret);
  });
});
