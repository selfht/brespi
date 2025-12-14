import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { PipelineError } from "@/errors/PipelineError";
import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Action } from "@/models/Action";
import { Artifact } from "@/models/Artifact";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { Temporal } from "@js-temporal/polyfill";
import { rm } from "fs/promises";
import z from "zod/v4";

export class ExecutionService {
  public constructor(
    private readonly executionRepository: ExecutionRepository,
    private readonly pipelineRepository: PipelineRepository,
    private readonly adapterService: AdapterService,
  ) {}

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    return await this.executionRepository.query({ pipelineId: q.pipelineId });
  }

  public async find(id: string): Promise<Execution> {
    const execution = await this.executionRepository.findById(id);
    if (!execution) {
      throw ExecutionError.not_found();
    }
    return execution;
  }

  public async create(unknown: z.infer<typeof ExecutionService.CreateExecutionRequest>): Promise<Execution> {
    const { pipelineId } = ExecutionService.CreateExecutionRequest.parse(unknown);
    const execution: Execution = {
      id: Bun.randomUUIDv7(),
      pipelineId,
      startedAt: Temporal.Now.plainDateTimeISO(),
      actions: [],
      result: null,
    };
    const pipeline = await this.pipelineRepository.findById(pipelineId);
    if (!pipeline) {
      throw PipelineError.not_found();
    }
    if (!(await this.executionRepository.create(execution))) {
      throw ExecutionError.already_exists();
    }
    this.execute(execution.id, pipeline); // no await, to turn it into a background task
    return execution;
  }

  private async execute(executionId: string, pipeline: Pipeline): Promise<void> {
    // Build a map to find children of each step
    const childrenMap = new Map<string | null, Step[]>();
    for (const step of pipeline.steps) {
      if (!childrenMap.has(step.previousId)) {
        childrenMap.set(step.previousId, []);
      }
      childrenMap.get(step.previousId)!.push(step);
    }

    // Find root step (the one with previousId === null)
    const startingSteps = childrenMap.get(null) || [];
    if (startingSteps.length !== 1) {
      throw new Error("Illegal state; pipeline must have exactly one starting step");
    }

    // Execute from root, walking the tree
    await this.executeStep(executionId, startingSteps[0], [], [], childrenMap);

    // Set final result
    const execution = (await this.executionRepository.findById(executionId))!;
    const hasErrors = execution.actions.some((a) => a.outcome === Outcome.error);
    const completedAt = Temporal.Now.plainDateTimeISO();
    execution.result = {
      outcome: hasErrors ? Outcome.error : Outcome.success,
      duration: execution.startedAt.until(completedAt),
      completedAt,
    };
    await this.executionRepository.update(execution);
  }

  private async executeStep(
    executionId: string,
    step: Step,
    artifacts: Artifact[],
    trail: Step[],
    childrenMap: Map<string | null, Step[]>,
  ): Promise<void> {
    const currentTrail = [...trail, step];
    const startTime = Temporal.Now.plainDateTimeISO();
    const artifactsConsumed = artifacts.length;

    try {
      // Execute the step
      const newArtifacts = await this.adapterService.submit(artifacts, step, currentTrail);
      const endTime = Temporal.Now.plainDateTimeISO();
      const duration = startTime.until(endTime);

      // Create action for successful step
      const action: Action = {
        stepId: step.id,
        previousStepId: step.previousId,
        stepType: step.type,
        outcome: Outcome.success,
        duration,
        artifactsConsumed,
        artifactsProduced: newArtifacts.length,
        failures: [],
      };

      // Update execution (reload to ensure we have latest state for concurrent updates)
      const execution = await this.executionRepository.findById(executionId);
      if (execution) {
        execution.actions.push(action);
        await this.executionRepository.update(execution);
      }

      // Cleanup old artifacts
      await this.cleanup(artifacts);

      // Find and execute all children in parallel
      const children = childrenMap.get(step.id) || [];
      await Promise.all(children.map((child) => this.executeStep(executionId, child, newArtifacts, currentTrail, childrenMap)));
    } catch (error) {
      const endTime = Temporal.Now.plainDateTimeISO();
      const duration = startTime.until(endTime);

      // Create action for failed step
      const action: Action = {
        stepId: step.id,
        previousStepId: step.previousId,
        stepType: step.type,
        outcome: Outcome.error,
        duration,
        artifactsConsumed,
        artifactsProduced: 0,
        failures: [
          {
            problem: error instanceof Error ? error.name : "UnknownError",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };

      // Update execution
      const execution = await this.executionRepository.findById(executionId);
      if (execution) {
        execution.actions.push(action);
        await this.executionRepository.update(execution);
      }

      // Don't execute children if step failed
    }
  }

  private async cleanup(artifacts: Artifact[]): Promise<void> {
    const artifactsWithinRootFolder = artifacts.filter((a) => a.path.startsWith(Env.artifactsRoot()));
    for (const artifact of artifactsWithinRootFolder) {
      await rm(artifact.path, { recursive: true, force: true });
    }
  }
}

export namespace ExecutionService {
  export const CreateExecutionRequest = z
    .object({
      pipelineId: z.string(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
