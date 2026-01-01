import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { readdir, rename, rm } from "fs/promises";
import { basename, dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";

export class ScriptAdapter extends AbstractAdapter {
  public constructor(protected readonly env: Env.Private) {
    super(env);
  }

  public async execute(artifacts: Artifact[], step: Step.ScriptExecution): Promise<Artifact[]> {
    if (step.passthrough) {
      await this.executeScript(step.path);
      return artifacts;
    }
    const [artifactsIn, artifactsOut] = await Promise.all([
      this.createTmpDestination(), //
      this.createTmpDestination(),
    ]);
    try {
      await this.moveArtifacts(artifacts, artifactsIn);
      await this.executeScript(step.path, {
        BRESPI_ARTIFACTS_IN: artifactsIn,
        BRESPI_ARTIFACTS_OUT: artifactsOut,
      });
      return await this.readArtifactsFromDirectory(artifactsOut);
    } finally {
      await Promise.all([
        rm(artifactsIn, { recursive: true, force: true }), //
        rm(artifactsOut, { recursive: true, force: true }),
      ]);
    }
  }

  private async executeScript(scriptPath: string, env: Record<string, string> = {}): Promise<void> {
    await this.runCommand({
      cmd: ["bash", "-c", `./${basename(scriptPath)}`],
      cwd: dirname(scriptPath),
      env: {
        ...process.env,
        ...env,
      },
    });
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
      artifacts.push({
        id: outputId,
        type: entry.isFile() ? "file" : "directory",
        path: outputPath,
        name: entry.name,
      });
    }
    return artifacts;
  }
}
