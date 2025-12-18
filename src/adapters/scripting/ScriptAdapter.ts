import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { spawn } from "bun";
import { readdir, rename, rm, stat } from "fs/promises";
import { dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";

export class ScriptAdapter extends AbstractAdapter {
  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async execute(artifacts: Artifact[], options: Step.ScriptExecution): Promise<Artifact[]> {
    if (options.passthrough) {
      await this.executeScript(options.path);
      return artifacts;
    }

    const artifactsIn = await this.createTempDir();
    const artifactsOut = await this.createTempDir();
    try {
      await this.moveArtifacts(artifacts, artifactsIn);
      await this.executeScript(options.path, {
        BRESPI_ARTIFACTS_IN: artifactsIn,
        BRESPI_ARTIFACTS_OUT: artifactsOut,
      });
      return await this.readArtifactsFromDirectory(artifactsOut);
    } catch (error) {
      throw new Error(`Script execution failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await rm(artifactsIn, { recursive: true, force: true });
      await rm(artifactsOut, { recursive: true, force: true });
    }
  }

  private async executeScript(scriptPath: string, env: Record<string, string> = {}): Promise<void> {
    const proc = spawn({
      cmd: ["bash", scriptPath],
      cwd: dirname(scriptPath),
      env: {
        ...process.env,
        ...env,
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    if (proc.exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Script exited with code ${proc.exitCode}: ${stderr}`);
    }
  }

  private async moveArtifacts(artifacts: Artifact[], targetDir: string): Promise<void> {
    for (const artifact of artifacts) {
      const targetPath = join(targetDir, artifact.name);
      await rename(artifact.path, targetPath);
    }
  }

  private async readArtifactsFromDirectory(dirPath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const inputPath = join(dirPath, entry.name);
      const { outputId, outputPath } = this.generateArtifactDestination();
      await rename(inputPath, outputPath);
      if (entry.isFile()) {
        const { size } = await stat(outputPath);
        artifacts.push({
          id: outputId,
          type: "file",
          name: entry.name,
          path: outputPath,
          size,
        });
      } else if (entry.isDirectory()) {
        artifacts.push({
          id: outputId,
          type: "directory",
          name: entry.name,
          path: outputPath,
        });
      }
    }
    return artifacts;
  }
}
