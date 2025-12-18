import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { copyFile, cp, mkdir, readdir, rename, stat } from "fs/promises";
import { basename, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { Env } from "@/Env";

export class FilesystemAdapter extends AbstractAdapter {
  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  /**
   * Read file(s) from filesystem and convert to artifacts
   */
  public async read(step: Step.FilesystemRead): Promise<Artifact> {
    const { outputId, outputPath } = this.generateArtifactDestination();
    await cp(step.path, outputPath, { recursive: true });

    const stats = await stat(outputPath);
    const name = basename(step.path);
    if (stats.isFile()) {
      return {
        id: outputId,
        type: "file",
        path: outputPath,
        size: stats.size,
        name,
      };
    } else {
      return {
        id: outputId,
        type: "directory",
        path: outputPath,
        name,
      };
    }
  }

  /**
   * Write artifacts from pipeline to a directory on filesystem
   */
  public async write(artifacts: Artifact[], step: Step.FilesystemWrite): Promise<void> {
    // Ensure the destination folder
    await mkdir(step.path, { recursive: true });
    for (const artifact of artifacts) {
      const destinationPath = join(step.path, artifact.name);
      if (artifact.type === "file") {
        await copyFile(artifact.path, destinationPath);
      } else if (artifact.type === "directory") {
        await cp(artifact.path, destinationPath, { recursive: true });
      }
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

  private async readDirectoryRecursively(dirPath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        const { outputId, outputPath } = this.generateArtifactDestination();
        await rename(fullPath, outputPath);
        const { size } = await stat(outputPath);
        artifacts.push({
          id: outputId,
          type: "file",
          name: entry.name,
          path: outputPath,
          size,
        });
      } else if (entry.isDirectory()) {
        const subArtifacts = await this.readDirectoryRecursively(fullPath);
        artifacts.push(...subArtifacts);
      }
    }
    return artifacts;
  }
}
