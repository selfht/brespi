import { stat, mkdir } from "fs/promises";
import { spawn } from "bun";
import { Artifact } from "@/models/Artifact";
import { PipelineStep } from "@/models/PipelineStep";
import { NamingHelper } from "@/helpers/NamingHelper";
import { basename, dirname } from "path";
import { Config } from "@/Config";
import { rm } from "fs/promises";
import { FolderHelper } from "@/helpers/FolderHelper";
import { rename } from "fs/promises";
import { cp } from "fs/promises";

export class CompressionAdapter {
  public async compress(artifact: Artifact, options: PipelineStep.Compression): Promise<Artifact> {
    const inputPath = artifact.path;
    const outputPath = NamingHelper.generatePath(artifact);

    // Use tar with gzip for both files and directories
    // For files: tar -czf output.tar.gz -C /parent/dir filename
    // For directories: tar -czf output.tar.gz -C /parent/dir dirname
    const targetName = basename(inputPath);
    const parentDir = dirname(inputPath);

    const proc = spawn({
      cmd: ["tar", "-czf", outputPath, "-C", parentDir, targetName],
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
      path: outputPath,
      size: stats.size,
      type: "file",
      name: artifact.name,
      timestamp: artifact.timestamp,
    };
  }

  public async decompress(artifact: Artifact, options: PipelineStep.Decompression): Promise<Artifact> {
    if (artifact.type !== "file") {
      throw new Error(`Unsupported artifact type: ${artifact.type}`);
    }

    const inputPath = artifact.path;
    const tempPath = await Config.createTempDir();

    // const outputPath = NamingHelper.generatePath(artifact);
    try {
      // Use tar to extract (works for both single files and directories)
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

      const newPath = NamingHelper.generatePath(artifact);

      const singleChildPath = await FolderHelper.findSingleChildPathWithinDirectory(tempPath);
      await rename(singleChildPath, newPath);

      const stats = await stat(newPath);
      if (stats.isDirectory()) {
        return {
          path: newPath,
          type: "directory",
          name: artifact.name,
          timestamp: artifact.timestamp,
        };
      } else {
        return {
          path: newPath,
          type: "file",
          size: stats.size,
          name: artifact.name,
          timestamp: artifact.timestamp,
        };
      }
    } finally {
      await rm(tempPath, { recursive: true, force: true });
    }
  }
}
