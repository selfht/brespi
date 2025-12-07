import { PipelineViewData } from "@/__testdata__/PipelineViewData";
import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { PipelineError } from "@/errors/PipelineError";
import { Artifact } from "@/models/Artifact";
import { Pipeline } from "@/models/Pipeline";
import { BetterOmit } from "@/types/BetterOmit";
import { PipelineView } from "@/views/PipelineView";
import { rm } from "fs/promises";

export class PipelineService {
  private readonly REPOSITORY = [PipelineViewData.POSTGRES_BACKUP, PipelineViewData.WP_BACKUP, PipelineViewData.RESTORE];

  public constructor(private readonly adapterService: AdapterService) {}

  public async query(): Promise<PipelineView[]> {
    return this.REPOSITORY;
  }

  public async find(id: string): Promise<PipelineView> {
    const pipeline = this.REPOSITORY.find((p) => p.id === id);
    if (!pipeline) {
      throw PipelineError.not_found();
    }
    return pipeline;
  }

  public async create(pipeline: BetterOmit<Pipeline, "id">): Promise<PipelineView> {
    const newPipeline: PipelineView = {
      ...pipeline,
      id: Bun.randomUUIDv7(),
      executions: [],
    };
    this.REPOSITORY.push(newPipeline);
    return newPipeline;
  }

  public async update(id: string, pipeline: Pipeline): Promise<PipelineView> {
    const existingPipeline = this.REPOSITORY.find((p) => p.id === id);
    if (!existingPipeline) {
      throw PipelineError.not_found();
    }
    Object.assign(existingPipeline, pipeline, { id });
    return existingPipeline;
  }

  public async remove(id: string): Promise<PipelineView> {
    const existingPipeline = this.REPOSITORY.find((p) => p.id === id);
    if (!existingPipeline) {
      throw PipelineError.not_found();
    }
    this.REPOSITORY.splice(this.REPOSITORY.indexOf(existingPipeline), 1);
    return existingPipeline;
  }

  public async execute(pipeline: Pipeline): Promise<Artifact[]> {
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
