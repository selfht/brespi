import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { Artifact } from "@/models/Artifact";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { exec } from "child_process";
import { rm } from "fs/promises";

export class ExecutionService {
  public constructor(
    private readonly repository: ExecutionRepository,
    private readonly adapterService: AdapterService,
  ) {}

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    return await this.repository.query({ pipelineId: q.pipelineId });
  }

  public async find(id: string): Promise<Execution> {
    const execution = await this.repository.find(id);
    if (!execution) {
      throw ExecutionError.not_found();
    }
    return execution;
  }

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
