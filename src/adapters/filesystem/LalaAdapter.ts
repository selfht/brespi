import { NamingHelper } from "@/helpers/NamingHelper";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { Temporal } from "@js-temporal/polyfill";
import { copyFile, mkdir, readdir, stat } from "fs/promises";
import { basename, join } from "path";

export class FileSystemAdapter {
  /**
   * Read file(s) from filesystem and convert to artifacts
   */
  public async read(options: Step.FilesystemRead): Promise<Artifact[]> {
    return [await this.convertItemIntoArtifact(options.path)];
  }

  /**
   * Write artifacts from pipeline to a directory on filesystem
   */
  public async write(artifacts: Artifact[], options: Step.FilesystemWrite): Promise<void> {
    // Ensure destination directory exists
    await mkdir(options.path, { recursive: true });

    for (const artifact of artifacts) {
      const filename = basename(artifact.path);
      const destPath = join(options.path, filename);

      if (artifact.type === "file") {
        await copyFile(artifact.path, destPath);
      } else if (artifact.type === "directory") {
        await this.copyDirectory(artifact.path, destPath);
      }
    }
  }

  public async folderFlatten(artifacts: Artifact[], options: Step.FolderFlatten): Promise<Artifact[]> {
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
      if (artifact.type === "file") {
        result.push(artifact);
      } else {
        // TODO: does this work? wouldn't we need to move or copy files?
        // whatabout the automatic deletion of stuff inside /artifacts/xxxx?
        result.push(...(await this.readDirectoryRecursively(artifact.path)));
      }
    }
    return result;
  }

  public async folderGroup(artifacts: Artifact[], options: Step.FolderGroup): Promise<Artifact> {
    throw new Error("Not imlemented");
  }

  private async convertItemIntoArtifact(path: string): Promise<Artifact> {
    const stats = await stat(path);
    const timestamp = Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);
    const name = this.extractName(basename(path));
    if (stats.isFile()) {
      return {
        type: "file",
        path: path,
        size: stats.size,
        name,
        timestamp,
      };
    } else {
      return {
        type: "directory",
        path: path,
        name,
        timestamp,
      };
    }
  }

  /**
   *  TODO TODO need this for group_flatten
   */
  private async readDirectoryRecursively(dirPath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        artifacts.push(await this.convertItemIntoArtifact(fullPath));
      } else if (entry.isDirectory()) {
        const subArtifacts = await this.readDirectoryRecursively(fullPath);
        artifacts.push(...subArtifacts);
      }
    }
    return artifacts;
  }

  private async copyDirectory(srcPath: string, destPath: string): Promise<void> {
    await mkdir(destPath, { recursive: true });
    const entries = await readdir(srcPath, { withFileTypes: true });

    for (const entry of entries) {
      const srcFullPath = join(srcPath, entry.name);
      const destFullPath = join(destPath, entry.name);

      if (entry.isFile()) {
        await copyFile(srcFullPath, destFullPath);
      } else if (entry.isDirectory()) {
        await this.copyDirectory(srcFullPath, destFullPath);
      }
    }
  }

  private extractName(filename: string): string {
    const lastDotIndex = filename.lastIndexOf(".");
    const filenameWithoutExtension = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    return NamingHelper.sanitizeName(filenameWithoutExtension);
  }
}
