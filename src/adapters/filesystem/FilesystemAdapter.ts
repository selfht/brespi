import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TrailStep } from "@/models/TrailStep";
import { Manifest } from "@/models/versioning/Manifest";
import { VersioningSystem } from "@/versioning/VersioningSystem";
import { copyFile, cp, mkdir, readdir, rename, stat } from "fs/promises";
import { basename, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";

export class FilesystemAdapter extends AbstractAdapter {
  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  /**
   * Write artifacts from pipeline to a directory on filesystem
   */
  public async write(artifacts: Artifact[], step: Step.FilesystemWrite, trail: TrailStep[]): Promise<void> {
    this.ensureOnlyFiles(artifacts);
    await mkdir(step.path, { recursive: true });
    if (step.brespiManaged) {
      const { manifestModifier, artifactIndex, insertableArtifacts } = VersioningSystem.prepareInsertion({
        baseFolder: step.path,
        artifacts,
        trail,
      });
      // Save manifest
      await this.handleManifestExclusively(step.path, async (manifest, save) => {
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
        const destinationPath = join(step.path, artifact.name);
        if (artifact.type === "file") {
          await copyFile(artifact.path, destinationPath);
        } else if (artifact.type === "directory") {
          await cp(artifact.path, destinationPath, { recursive: true });
        }
      }
    }
  }

  /**
   * Read file(s) from filesystem and convert to artifacts
   */
  public async read(step: Step.FilesystemRead): Promise<Artifact[]> {
    if (step.brespiManaged) {
      const { selectableArtifactsFn } = VersioningSystem.prepareSelection({
        baseFolder: step.path,
        selection: step.brespiManaged.selection,
        storageReaderFn: ({ absolutePath }) => Bun.file(absolutePath).json(),
      });
      const selectableArtifacts = await this.handleManifestExclusively(step.path, async (manifest) => {
        return await selectableArtifactsFn({ manifest });
      });
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
      return artifacts;
    } else {
      const { outputId, outputPath } = this.generateArtifactDestination();
      await cp(step.path, outputPath, { recursive: true });
      const stats = await stat(outputPath);
      const name = basename(step.path);
      return [
        {
          id: outputId,
          type: stats.isFile() ? "file" : "directory",
          path: outputPath,
          name,
        },
      ];
    }
  }

  public async folderFlatten(artifacts: Artifact[], step: Step.FolderFlatten): Promise<Artifact[]> {
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
      if (artifact.type === "file") {
        result.push(artifact); // Re-use is okay; cleanup won't clean output artifacts
      } else {
        result.push(...(await this.readDirectoryRecursively(artifact.path)));
      }
    }
    return result;
  }

  public async folderGroup(artifacts: Artifact[], step: Step.FolderGroup): Promise<Artifact> {
    const { outputId, outputPath } = this.generateArtifactDestination();
    await mkdir(outputPath);
    for (const artifact of artifacts) {
      await rename(artifact.path, join(outputPath, artifact.name));
    }
    return {
      id: outputId,
      type: "directory",
      name: `group(${artifacts.length})`,
      path: outputPath,
    };
  }

  private async handleManifestExclusively<T>(
    folder: string,
    fn: (mani: Manifest, saveFn: (mf: Manifest) => Promise<Manifest>) => T | Promise<T>,
  ): Promise<Awaited<T>> {
    const { release } = await Mutex.acquireFromRegistry({ key: [FilesystemAdapter.name, folder] });
    try {
      const manifestPath = join(folder, Manifest.NAME);
      const manifestFile = Bun.file(manifestPath);
      const manifestContent: Manifest = (await manifestFile.exists()) ? Manifest.parse(await manifestFile.json()) : Manifest.empty();
      const saveFn = (newManifest: Manifest) => Bun.write(manifestPath, JSON.stringify(newManifest)).then(() => newManifest);
      return await fn(manifestContent, saveFn);
    } finally {
      release();
    }
  }

  private ensureOnlyFiles(artifacts: Artifact[]) {
    const nonFileArtifact = artifacts.find(({ type }) => type !== "file");
    if (nonFileArtifact) {
      throw new Error(`Encountered non-file artifact: ${nonFileArtifact.name}`);
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
