import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { readdir, rename, rm } from "fs/promises";
import { basename, dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { Exception } from "@/errors/exception/Exception";

export class CompressionAdapter extends AbstractAdapter {
  private readonly EXTENSION = ".tar.gz";

  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async compress(artifact: Artifact, step: Step.Compression): Promise<Artifact> {
    try {
      const inputPath = artifact.path;
      const { outputId, outputPath } = this.generateArtifactDestination();
      // Use tar with gzip for both files and directories
      // For files: tar -czf output.tar.gz -C /parent/dir filename
      // For directories: tar -czf output.tar.gz -C /parent/dir dirname
      await this.runCommand({
        cmd: ["tar", "-czf", outputPath, "-C", dirname(inputPath), basename(inputPath)],
      });
      return {
        id: outputId,
        type: "file",
        path: outputPath,
        name: this.addExtension(artifact.name, this.EXTENSION),
      };
    } catch (e) {
      throw this.mapError(e, ExecutionError.compression_failed);
    }
  }

  public async decompress(artifact: Artifact, step: Step.Decompression): Promise<Artifact> {
    this.requireArtifactType("file", artifact);
    const inputPath = artifact.path;
    const tempPath = await this.createTmpDestination();
    try {
      // Use tar to extract (works for both single files and directories)
      // Will place the resulting "item" (file or folder) as the only child inside the temp dir
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
