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
import { exec } from "child_process";
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
    const [startingStep] = childrenMap.get(null) || [];
    if (!startingStep) {
      throw new Error("Illegal state: missing starting step");
    }

    // Execute from root, walking the tree
    const execution = await this.executeTreeRecursively({
      executionId,
      step: startingStep,
      input: [],
      trail: [],
      childrenMap,
    });

    // Set final result
    const hasError = execution.actions.some((a) => a.outcome === Outcome.error);
    const completedAt = Temporal.Now.plainDateTimeISO();
    execution.result = {
      outcome: hasError ? Outcome.error : Outcome.success,
      duration: execution.startedAt.until(completedAt),
      completedAt,
    };
    await this.executionRepository.update(execution);
  }

  private async executeTreeRecursively({
    executionId,
    step,
    input,
    trail,
    childrenMap,
  }: {
    executionId: string;
    step: Step;
    input: Artifact[];
    trail: Step[];
    childrenMap: Map<string | null, Step[]>;
  }): Promise<Execution> {
    const startedAt = Temporal.Now.plainDateTimeISO();
    const currentTrail = [...trail, step];

    let output: Artifact[];
    let outcome: Outcome;
    let failure: Action.Failure | null;
    try {
      output = await this.adapterService.submit(input, step, currentTrail);
      outcome = Outcome.success;
      failure = null;
    } catch (e) {
      output = [];
      outcome = Outcome.error;
      failure = {
        problem: e instanceof Error ? e.name : "UnknownError",
        message: e instanceof Error ? e.message : String(e),
      };
    } finally {
      await this.cleanupArtifacts(input);
    }
    const completedAt = Temporal.Now.plainDateTimeISO();
    const duration = startedAt.until(completedAt);

    const action: Action = {
      stepId: step.id,
      previousStepId: step.previousId,
      stepType: step.type,
      outcome,
      startedAt,
      completedAt,
      duration,
      artifactsConsumed: input.length,
      artifactsProduced: output.length,
      failure,
    };

    const execution = await this.executionRepository.findById(executionId);
    if (!execution) {
      throw new Error("Illegal state: missing execution");
    }
    execution.actions.push(action);
    await this.executionRepository.update(execution);

    if (outcome === Outcome.success) {
      // Only execute children if the current parent step succeeded
      const children = childrenMap.get(step.id) || [];
      const childrenInput: Map<string, Artifact[]> = new Map();
      for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (index === 0) {
          childrenInput.set(child.id, output);
        } else {
          childrenInput.set(child.id, await this.copyArtifacts(output));
        }
      }
      await Promise.all(
        children.map((child) =>
          this.executeTreeRecursively({
            executionId,
            step: child,
            input: childrenInput.get(child.id)!,
            trail: currentTrail,
            childrenMap,
          }),
        ),
      );
    }

    return execution;
  }

  private async cleanupArtifacts(artifacts: Artifact[]): Promise<void> {
    throw new Error("Not implemented");
    const artifactsWithinRootFolder = artifacts.filter((a) => a.path.startsWith(Env.artifactsRoot()));
    for (const artifact of artifactsWithinRootFolder) {
      await rm(artifact.path, { recursive: true, force: true });
    }
  }

  private async copyArtifacts(artifacts: Artifact[]): Promise<Artifact[]> {
    throw new Error("Not implemented");
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
