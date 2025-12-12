import { PipelineViewData } from "@/__testdata__/PipelineViewData";
import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { PipelineError } from "@/errors/PipelineError";
import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Artifact } from "@/models/Artifact";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { PipelineView } from "@/views/PipelineView";
import { rm } from "fs/promises";
import z from "zod/v4";
import { StepService } from "./StepService";

export class PipelineService {
  private readonly REPOSITORY = [PipelineViewData.POSTGRES_BACKUP, PipelineViewData.WP_BACKUP, PipelineViewData.RESTORE];

  public constructor(
    private readonly stepService: StepService,
    private readonly adapterService: AdapterService,
  ) {}

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

  public async create(unknown: unknown): Promise<PipelineView> {
    const pipeline = this.validate({
      id: Bun.randomUUIDv7(),
      ...PipelineService.UpsertPipelineRequest.parse(unknown),
    });

    this.REPOSITORY.push({ ...pipeline, executions: [] });
    return this.REPOSITORY[this.REPOSITORY.length - 1];
  }

  public async update(id: string, unknown: unknown): Promise<PipelineView> {
    const pipeline = this.validate({
      id,
      ...PipelineService.UpsertPipelineRequest.parse(unknown),
    });

    const existingPipeline = this.REPOSITORY.find((p) => p.id === id);
    if (!existingPipeline) {
      throw PipelineError.not_found();
    }

    const index = this.REPOSITORY.indexOf(existingPipeline);
    this.REPOSITORY.splice(index, 1, { ...pipeline, executions: [] });
    return this.REPOSITORY[index];
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

  private validate(pipeline: Pipeline) {
    const startingSteps = pipeline.steps.filter((s) => !s.previousId);
    if (startingSteps.length === 0) {
      throw PipelineError.missing_starting_step();
    }
    if (startingSteps.length > 1) {
      throw PipelineError.too_many_starting_steps();
    }
    // this already eliminates any possible cycles
    const availableStepIds: string[] = [];
    const referencedStepIds: string[] = [];
    pipeline.steps.forEach(({ id, previousId: previousStepId }) => {
      availableStepIds.push(id);
      if (previousStepId) {
        referencedStepIds.push(previousStepId);
      }
    });
    if (!referencedStepIds.every((id) => availableStepIds.includes(id))) {
      throw PipelineError.invalid_step_references();
    }
    pipeline.steps.forEach((step) => this.stepService.validate(step));
    return pipeline;
  }
}

export namespace PipelineService {
  export const UpsertPipelineRequest = z
    .object({
      name: z.string(),
      steps: z.array(Step.parse.SCHEMA),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
