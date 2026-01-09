import { FilterCapability } from "@/capabilities/FilterCapability";
import { Manifest } from "@/capabilities/managedstorage/Manifest";
import { ManagedStorageCapability } from "@/capabilities/ManagedStorageCapability";
import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { copyFile, cp, mkdir, readdir, rename } from "fs/promises";
import { basename, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";

export class FilesystemAdapter extends AbstractAdapter {
  public constructor(
    protected readonly env: Env.Private,
    private readonly managedStorageCapability: ManagedStorageCapability,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env);
  }

  public async write(artifacts: Artifact[], step: Step.FilesystemWrite, trail: StepWithRuntime[]): Promise<AdapterResult> {
    await mkdir(step.folderPath, { recursive: true });
    if (step.managedStorage) {
      this.requireArtifactType("file", ...artifacts);
      const { manifestModifier, artifactIndex, insertableArtifacts } = this.managedStorageCapability.prepareInsertion({
        baseFolder: step.folderPath,
        artifacts,
        trail,
      });
      // Save manifest
      await this.handleManifestExclusively(step.folderPath, async (manifest, save) => {
        await save(manifestModifier({ manifest }));
      });
      // Save index
      await Bun.write(artifactIndex.destinationPath, JSON.stringify(artifactIndex.content));
      // Save artifacts
      for (const { sourcePath, destinationPath } of insertableArtifacts) {
        await Bun.write(destinationPath, Bun.file(sourcePath));
      }
    } else {
      for (const artifact of artifacts) {
        const destinationPath = join(step.folderPath, artifact.name);
        if (artifact.type === "file") {
          await copyFile(artifact.path, destinationPath);
        } else if (artifact.type === "directory") {
          await cp(artifact.path, destinationPath, { recursive: true });
        }
      }
    }
    return AdapterResult.create();
  }

  public async read(step: Step.FilesystemRead): Promise<AdapterResult> {
    if (step.managedStorage) {
      // Prepare selaction
      const { selectableArtifactsFn } = this.managedStorageCapability.prepareSelection({
        baseFolder: step.path,
        configuration: step.managedStorage,
        storageReaderFn: ({ absolutePath }) => Bun.file(absolutePath).text(),
      });
      // Provide manifest
      let { selectableArtifacts, version } = await this.handleManifestExclusively(step.path, async (manifest) => {
        return await selectableArtifactsFn({ manifest });
      });
      // Optional: filter
      if (step.filterCriteria) {
        const { predicate } = this.filterCapability.createPredicate(step.filterCriteria);
        selectableArtifacts = selectableArtifacts.filter(predicate);
      }
      // Retrieve artifacts
      const artifacts: Artifact[] = [];
      for (const { name, path } of selectableArtifacts) {
        const { outputId, outputPath } = this.generateArtifactDestination();
        await Bun.write(outputPath, Bun.file(path));
        artifacts.push({
          id: outputId,
          type: "file",
          path: outputPath,
          name,
        });
      }
      return AdapterResult.create(artifacts, { version });
    } else {
      const { outputId, outputPath } = this.generateArtifactDestination();
      const stats = await this.requireFilesystemExistence(step.path);
      await cp(step.path, outputPath, { recursive: true });
      return AdapterResult.create({
        id: outputId,
        type: stats.type,
        path: outputPath,
        name: basename(step.path),
      });
    }
  }

  public async folderFlatten(artifacts: Artifact[], step: Step.FolderFlatten): Promise<AdapterResult> {
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
      if (artifact.type === "file") {
        result.push(artifact); // Re-use is okay; cleanup won't clean output artifacts
      } else {
        result.push(...(await this.readDirectoryRecursively(artifact.path)));
      }
    }
    return AdapterResult.create(result);
  }

  public async folderGroup(artifacts: Artifact[], step: Step.FolderGroup): Promise<AdapterResult> {
    const { outputId, outputPath } = this.generateArtifactDestination();
    await mkdir(outputPath);
    for (const artifact of artifacts) {
      await rename(artifact.path, join(outputPath, artifact.name));
    }
    return AdapterResult.create({
      id: outputId,
      type: "directory",
      name: `group(${artifacts.length})`,
      path: outputPath,
    });
  }

  private async handleManifestExclusively<T>(
    folder: string,
    fn: (mani: Manifest, saveFn: (mf: Manifest) => Promise<Manifest>) => T | Promise<T>,
  ): Promise<Awaited<T>> {
    const { release } = await Mutex.acquireFromRegistry({ key: [FilesystemAdapter.name, folder] });
    try {
      const manifestPath = join(folder, Manifest.NAME);
      const manifestFile = Bun.file(manifestPath);
      const manifestContent: Manifest = (await manifestFile.exists())
        ? this.managedStorageCapability.parseManifest(await manifestFile.text())
        : Manifest.empty();
      const saveFn = (newManifest: Manifest) => Bun.write(manifestPath, JSON.stringify(newManifest)).then(() => newManifest);
      return await fn(manifestContent, saveFn);
    } finally {
      release();
    }
  }

  private async readDirectoryRecursively(dirPath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        const { outputId, outputPath } = this.generateArtifactDestination();
        await rename(fullPath, outputPath);
        artifacts.push({
          id: outputId,
          type: "file",
          path: outputPath,
          name: entry.name,
        });
      } else if (entry.isDirectory()) {
        const subArtifacts = await this.readDirectoryRecursively(fullPath);
        artifacts.push(...subArtifacts);
      }
    }
    return artifacts;
  }
}
