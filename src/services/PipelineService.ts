import { PipelineError } from "@/errors/PipelineError";
import { ServerError } from "@/errors/ServerError";
import { EventBus } from "@/events/EventBus";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { PipelineView } from "@/views/PipelineView";
import z from "zod/v4";
import { StepService } from "./StepService";

export class PipelineService {
  public constructor(
    private readonly eventBus: EventBus,
    private readonly pipelineRepository: PipelineRepository,
    private readonly executionRepository: ExecutionRepository,
    private readonly stepService: StepService,
  ) {}

  public async list(): Promise<PipelineView[]> {
    const pipelines = await this.pipelineRepository.list();
    return await this.enhance(pipelines);
  }

  public async find(id: string): Promise<PipelineView> {
    const pipeline = await this.pipelineRepository.findById(id);
    if (!pipeline) {
      throw PipelineError.not_found({ id });
    }
    return await this.enhance(pipeline);
  }

  public async create(unknown: z.output<typeof PipelineService.Upsert>): Promise<PipelineView> {
    const pipeline = this.validate({
      id: Bun.randomUUIDv7(),
      object: "pipeline",
      ...PipelineService.Upsert.parse(unknown),
    });
    await this.pipelineRepository.create(pipeline);
    this.eventBus.publish({
      type: "pipeline_created",
      data: { pipeline },
    });
    return await this.enhance(pipeline);
  }

  public async update(id: string, unknown: z.output<typeof PipelineService.Upsert>): Promise<PipelineView> {
    const pipeline = this.validate({
      id,
      object: "pipeline",
      ...PipelineService.Upsert.parse(unknown),
    });
    await this.pipelineRepository.update(pipeline);
    this.eventBus.publish({
      type: "pipeline_updated",
      data: { pipeline },
    });
    return await this.enhance(pipeline);
  }

  public async delete(id: string): Promise<PipelineView> {
    const pipeline = await this.pipelineRepository.delete(id);
    this.eventBus.publish({
      type: "pipeline_deleted",
      data: { pipeline },
    });
    return await this.enhance(pipeline);
  }

  private async enhance(pipeline: Pipeline): Promise<PipelineView>;
  private async enhance(pipelines: Pipeline[]): Promise<PipelineView[]>;
  private async enhance(arg: Pipeline | Pipeline[]): Promise<PipelineView | PipelineView[]> {
    const isArray = Array.isArray(arg);
    const pipelines: Pipeline[] = isArray ? arg : [arg];
    const lastExecutionOutcomes = await this.executionRepository.queryMostRecentExecutions({
      pipelineIds: pipelines.map(({ id }) => id),
    });
    const pipelineViews: PipelineView[] = pipelines.map((p) => ({
      ...p,
      lastExecution: lastExecutionOutcomes.get(p.id)!,
    }));
    return isArray ? pipelineViews : pipelineViews[0];
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
  export const Upsert = z
    .object({
      name: z.string(),
      steps: z.array(Step.parse.SCHEMA),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
