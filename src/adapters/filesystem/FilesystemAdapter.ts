import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { copyFile, cp, mkdir, readdir, rename, rm } from "fs/promises";
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

  public async write(
    artifacts: Array<Pick<Artifact, "type" | "name" | "path">>,
    step: Step.FilesystemWrite,
    trail: StepWithRuntime[],
  ): Promise<AdapterResult> {
    await mkdir(step.folderPath, { recursive: true });
    if (step.managedStorage) {
      this.requireArtifactType("file", ...artifacts);
      const base = step.folderPath;
      const mutexKey = this.mutexKey(base);
      const readWriteFns = this.createReadWriteFns();

      const { insertableArtifacts } = await this.managedStorageCapability.insert({
        mutexKey,
        artifacts,
        trail,
        base,
        ...readWriteFns,
      });
      for (const { path, destinationPath } of insertableArtifacts) {
        await Bun.write(destinationPath, Bun.file(path));
      }

      if (step.retention) {
        const { removableItems } = await this.managedStorageCapability.clean({
          mutexKey,
          base,
          configuration: step.retention,
          ...readWriteFns,
        });
        for (const { version } of removableItems) {
          await rm(join(base, version), { recursive: true, force: true });
        }
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
      // Find artifacts
      let { resolvedVersion, selectableArtifacts } = await this.managedStorageCapability.select({
        mutexKey: this.mutexKey(step.path),
        base: step.path,
        configuration: step.managedStorage,
        ...this.createReadWriteFns(),
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
      return AdapterResult.create(artifacts, { version: resolvedVersion });
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

  private mutexKey(baseFolder: string) {
    return [FilesystemAdapter.name, baseFolder];
  }

  private createReadWriteFns(): ManagedStorageCapability.ReadWriteFns {
    return {
      async writeFn(item: { path: string; content: string }) {
        await Bun.write(item.path, item.content);
      },
      async readFn(path: string) {
        const file = Bun.file(path);
        const exists = await file.exists();
        return exists ? await file.text() : undefined;
      },
    };
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
