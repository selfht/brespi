import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { readdir, rename, rm } from "fs/promises";
import { basename, dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";

export class CompressionAdapter extends AbstractAdapter {
  private readonly EXTENSION = ".tar.gz";

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  /**
   * Compresses a file or directory into a .tar.gz archive with configurable compression level.
   *
   * Commands to reproduce:
   *   # Create uncompressed tar
   *   COPYFILE_DISABLE=1 tar -cf archive.tar -C /path/to/parent (filename|dirname)
   *
   *   # Compress with explicit level (1-9)
   *   gzip -9 -c archive.tar > archive.tar.gz
   *
   *   # Clean up intermediate file
   *   rm archive.tar
   */
  public async compress(artifact: Artifact, step: Step.Compression): Promise<Artifact> {
    const inputPath = artifact.path;
    const { outputId, outputPath } = this.generateArtifactDestination();
    const intermediatePath = `${outputPath}.tar`;
    try {
      const env = {
        ...Bun.env,
        COPYFILE_DISABLE: "1", // Prevents macOS tar from creating ._* AppleDouble files
      };
      // Create intermediate (uncompressed) tar
      await this.runCommand({
        cmd: ["tar", "-cf", intermediatePath, "-C", dirname(inputPath), basename(inputPath)],
        env,
      });
      // Compress with explicit level (output to stdout, redirect to file via shell)
      await this.runCommand({
        cmd: ["sh", "-c", `gzip -${step.algorithm.level} -c "${intermediatePath}" > "${outputPath}"`],
        env,
      });
      return {
        id: outputId,
        type: "file",
        path: outputPath,
        name: this.addExtension(artifact.name, this.EXTENSION),
      };
    } catch (e) {
      throw this.mapError(e, ExecutionError.compression_failed);
    } finally {
      await rm(intermediatePath, { recursive: true, force: true });
    }
  }

  /**
   * Decompresses a .tar.gz archive back to its original file or directory.
   * The archive must contain exactly one top-level item (otherwise, we didn't create it)
   *
   * Commands to reproduce:
   *   # Extract to temp directory
   *   tar -xzf archive.tar.gz -C /temp/dir
   *
   *   # Move the single extracted item to final destination
   *   mv /temp/dir/extracted-item /final/destination
   */
  public async decompress(artifact: Artifact, step: Step.Decompression): Promise<Artifact> {
    this.requireArtifactType("file", artifact);
    const inputPath = artifact.path;
    const tempPath = await this.createTmpDestination();
    try {
      await this.runCommand({
        cmd: ["tar", "-xzf", inputPath, "-C", tempPath],
      });

      const singleChildPath = await this.findSingleChildPathWithinDirectory(tempPath);
      const { outputId, outputPath } = this.generateArtifactDestination();
      await rename(singleChildPath, outputPath);

      const stats = await this.requireFilesystemExistence(outputPath);
      const name = this.stripExtension(artifact.name, this.EXTENSION);
      return {
        id: outputId,
        type: stats.type,
        path: outputPath,
        name,
      };
    } catch (e) {
      throw this.mapError(e, ExecutionError.decompression_failed);
    } finally {
      await rm(tempPath, { recursive: true, force: true });
    }
  }

  private async findSingleChildPathWithinDirectory(path: string): Promise<string> {
    const children = await readdir(path);
    const min = 1;
    const max = 1;
    const count = children.length;
    if (count < min || count > max) {
      throw ExecutionError.fsdir_children_count_invalid({ path, count, min, max });
    }
    return join(path, children[0]);
  }
}
