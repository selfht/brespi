import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Pipeline } from "@/models/Pipeline";
import { rm } from "fs/promises";

export class ExecutionService {
  public constructor(private readonly adapterService: AdapterService) {}

  public async create(pipeline: Pipeline): Promise<Artifact[]> {
    let artifacts: Artifact[] = [];
    for (let index = 0; index < pipeline.steps.length; index++) {
      const step = pipeline.steps[index];
      const trail = pipeline.steps.slice(0, index + 1);
      const newArtifacts = await this.adapterService.submit(artifacts, step, trail);
      await this.cleanup(artifacts);
      artifacts = newArtifacts;
    }
    return artifacts;
  }

  private async cleanup(artifacts: Artifact[]): Promise<void> {
    const artifactsWithinRootFolder = artifacts.filter((a) => a.path.startsWith(Env.artifactsRoot()));
    for (const artifact of artifactsWithinRootFolder) {
      await rm(artifact.path, { recursive: true, force: true });
    }
  }
}
