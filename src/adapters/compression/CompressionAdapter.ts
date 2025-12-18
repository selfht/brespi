import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { spawn } from "bun";
import { readdir, rename, rm, stat } from "fs/promises";
import { basename, dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";

export class CompressionAdapter extends AbstractAdapter {
  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async compress(artifact: Artifact, step: Step.Compression): Promise<Artifact> {
    const inputPath = artifact.path;
    const { outputId, outputPath } = this.generateArtifactDestination();

    // Use tar with gzip for both files and directories
    // For files: tar -czf output.tar.gz -C /parent/dir filename
    // For directories: tar -czf output.tar.gz -C /parent/dir dirname
    const proc = spawn({
      cmd: ["tar", "-czf", outputPath, "-C", dirname(inputPath), basename(inputPath)],
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    if (proc.exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Failed to compress: ${stderr}`);
    }

    const stats = await stat(outputPath);
    return {
      id: outputId,
      path: outputPath,
      size: stats.size,
      type: "file",
      name: artifact.name,
    };
  }

  public async decompress(artifact: Artifact, step: Step.Decompression): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw new Error(`Unsupported artifact type: ${artifact.type}`);
    }

    const inputPath = artifact.path;
    const tempPath = await this.createTempDir();
    try {
      // Use tar to extract (works for both single files and directories)
      // Will place the resulting "item" (file or folder) as the only child inside the temp dir
      const proc = spawn({
        cmd: ["tar", "-xzf", inputPath, "-C", tempPath],
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
      if (proc.exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`Failed to decompress: ${stderr}`);
      }

      const singleChildPath = await this.findSingleChildPathWithinDirectory(tempPath);
      const { outputId, outputPath } = this.generateArtifactDestination();
      await rename(singleChildPath, outputPath);

      const stats = await stat(outputPath);
      if (stats.isDirectory()) {
        return {
          id: outputId,
          type: "directory",
          path: outputPath,
          name: artifact.name,
        };
      } else {
        return {
          id: outputId,
          path: outputPath,
          type: "file",
          size: stats.size,
          name: artifact.name,
        };
      }
    } finally {
      await rm(tempPath, { recursive: true, force: true });
    }
  }

  private async findSingleChildPathWithinDirectory(dirPath: string): Promise<string> {
    const children = await readdir(dirPath);
    if (children.length === 0) {
      throw new Error(`Directory is empty: ${dirPath}`);
    }
    if (children.length > 1) {
      throw new Error(`Directory contains more than one child: ${dirPath} (found ${children.length} children)`);
    }
    return join(dirPath, children[0]);
  }
}
