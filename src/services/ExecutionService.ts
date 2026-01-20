import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { Exception } from "@/errors/exception/Exception";
import { ExecutionError } from "@/errors/ExecutionError";
import { PipelineError } from "@/errors/PipelineError";
import { ServerError } from "@/errors/ServerError";
import { Generate } from "@/helpers/Generate";
import { Mutex } from "@/helpers/Mutex";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Action } from "@/models/Action";
import { Artifact } from "@/models/Artifact";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { ServerMessage } from "@/socket/ServerMessage";
import { Socket } from "@/socket/Socket";
import { Temporal } from "@js-temporal/polyfill";
import { copyFile, rm } from "fs/promises";
import z from "zod/v4";

export class ExecutionService {
  private readonly sockets: Socket[] = [];

  public constructor(
    private readonly env: Env.Private,
    private readonly executionRepository: ExecutionRepository,
    private readonly pipelineRepository: PipelineRepository,
    private readonly adapterService: AdapterService,
  ) {}

  public registerSocket = (socket: Socket) => {
    this.sockets.push(socket);
  };

  public unregisterSocket = (socket: Socket) => {
    const index = this.sockets.findIndex((s) => s.data.clientId === socket.data.clientId);
    if (index >= 0) {
      this.sockets.splice(index, 1);
    }
  };

  private notifySockets = (execution: Execution) => {
    const message: ServerMessage = {
      type: ServerMessage.Type.execution_update,
      execution,
    };
    this.sockets.forEach((socket) => socket.send(JSON.stringify(message)));
  };

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

  public async create(unknown: z.output<typeof ExecutionService.Create>): Promise<Execution> {
    const { pipelineId, waitForCompletion } = ExecutionService.Create.parse(unknown);
    const pipeline = await this.pipelineRepository.findById(pipelineId);
    if (!pipeline) {
      throw PipelineError.not_found({ id: pipelineId });
    }

    const [existingExecution] = await this.executionRepository.query({ pipelineId, completed: false });
    if (existingExecution) {
      throw ExecutionError.already_executing({ id: existingExecution.id });
    }

    const id = Bun.randomUUIDv7();
    const execution: Execution = {
      id,
      object: "execution",
      pipelineId,
      startedAt: Temporal.Now.plainDateTimeISO(),
      actions: pipeline.steps.map((step) => ({
        id: Bun.randomUUIDv7(),
        object: "action",
        executionId: id,
        stepId: step.id,
        stepType: step.type,
        previousStepId: step.previousId,
        startedAt: null,
        result: null,
      })),
      result: null,
    };
    if (!(await this.executionRepository.create(execution))) {
      throw ExecutionError.already_exists();
    }

    if (waitForCompletion) {
      return await this.execute(execution.id, pipeline);
    } else {
      this.execute(execution.id, pipeline);
      return execution;
    }
  }

  private async execute(executionId: string, pipeline: Pipeline): Promise<Execution> {
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
    const mutex = new Mutex();
    await this.executeTreeRecursively({
      executionId,
      step: startingStep,
      input: [],
      trail: [],
      childrenMap,
      mutex,
    });
    const execution = (await this.executionRepository.findById(executionId))!;

    // Set final result
    const hasError = execution.actions.some((a) => a.result?.outcome === Outcome.error);
    const completedAt = Temporal.Now.plainDateTimeISO();
    execution.result = {
      outcome: hasError ? Outcome.error : Outcome.success,
      duration: execution.startedAt.until(completedAt),
      completedAt,
    };
    await this.executionRepository.update(execution);
    this.notifySockets(execution);
    return execution;
  }

  private async executeTreeRecursively({
    executionId,
    step,
    input,
    trail,
    childrenMap,
    mutex,
  }: {
    executionId: string;
    step: Step;
    input: Artifact[];
    trail: StepWithRuntime[];
    childrenMap: Map<string | null, Step[]>;
    mutex: Mutex;
  }): Promise<void> {
    const startedAt = Temporal.Now.plainDateTimeISO();
    await this.updateActionAndNotifySockets({
      executionId,
      actionStepId: step.id,
      mutex,
      updateFn: (action) => ({ ...action, startedAt }),
    });

    let output: Artifact[] = [];
    let outputTrail: StepWithRuntime[] = [];
    let outcome: Outcome;
    let errorMessage: string | null;
    try {
      const { artifacts, runtime } = await this.adapterService.submit(input, step, trail);
      output = this.ensureUniqueArtifactNames(artifacts);
      outputTrail = [...trail, { ...step, runtime }];
      outcome = Outcome.success;
      errorMessage = null;
    } catch (e) {
      output = [];
      outcome = Outcome.error;
      errorMessage = this.formatAdapterError(e);
    } finally {
      await Bun.sleep(this.env.X_BRESPI_ARTIFICIAL_STEP_EXECUTION_DELAY.total("milliseconds"));
      await this.cleanupArtifacts({ input, output });
    }
    const completedAt = Temporal.Now.plainDateTimeISO();
    const duration = startedAt.until(completedAt);

    const stepCategory = Step.getCategory(step);
    const consumed = [Step.Category.consumer, Step.Category.transformer].includes(stepCategory)
      ? input.map(({ type, name }) => ({ type, name }))
      : [];
    const produced = [Step.Category.producer, Step.Category.transformer].includes(stepCategory)
      ? output.map(({ type, name }) => ({ type, name }))
      : [];

    await this.updateActionAndNotifySockets({
      executionId,
      actionStepId: step.id,
      mutex,
      updateFn: (action) => ({
        ...action,
        result: {
          outcome,
          duration,
          completedAt,
          consumed,
          produced,
          errorMessage,
        },
      }),
    });
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
            trail: outputTrail,
            childrenMap,
            mutex,
          }),
        ),
      );
    }
  }

  private async updateActionAndNotifySockets({
    executionId,
    actionStepId,
    mutex,
    updateFn,
  }: {
    executionId: string;
    actionStepId: string;
    mutex: Mutex;
    updateFn: (action: Action) => Action;
  }): Promise<void> {
    const { release } = await mutex.acquire();
    try {
      const execution = await this.executionRepository.findById(executionId);
      if (!execution) {
        throw new Error(`Illegal state: missing execution; id=${executionId}`);
      }
      const actionIndex = execution.actions.findIndex((a) => a.stepId === actionStepId);
      if (actionIndex < 0) {
        throw new Error(`Illegal state: missing action; stepId=${actionStepId}`);
      }
      execution.actions.splice(actionIndex, 1, updateFn(execution.actions[actionIndex]));
      await this.executionRepository.update(execution);
      this.notifySockets(execution);
    } finally {
      release();
    }
  }

  /**
   * If there are multiple artifacts named `foo`, `bar.sql` and `top.tar.gz`, rename them as such:
   *  - `foo`, `foo(brespi-2)`, `foo(brespi-3)`
   *  - `bar.sql`, `bar(brespi-2).sql`, `bar(brespi-3).sql`
   *  - `top.tar.gz`, `top(brespi-2).tar.gz`, `top(brespi-3).tar.gz`
   */
  private ensureUniqueArtifactNames(artifacts: Artifact[]): Artifact[] {
    const nameCountMap = new Map<string, number>();
    return artifacts.map<Artifact>((artifact) => {
      const { baseName, extension } = this.splitNameAndExtension(artifact.name);
      const count = nameCountMap.get(baseName) || 0;
      nameCountMap.set(baseName, count + 1);
      if (count === 0) {
        return artifact;
      }
      const newName = `${baseName.trim()}(brespi-${count + 1})${extension.trim()}`;
      return {
        ...artifact,
        name: newName,
      };
    });
  }

  /**
   * Split a filename into base name and extension at the first period
   */
  private splitNameAndExtension(name: string): { baseName: string; extension: string } {
    const firstDotIndex = name.indexOf(".");
    if (firstDotIndex === -1 || firstDotIndex === 0) {
      return { baseName: name, extension: "" };
    }
    return {
      baseName: name.slice(0, firstDotIndex),
      extension: name.slice(firstDotIndex),
    };
  }

  /**
   * Only remove input artifacts which weren't reused in the output
   */
  private async cleanupArtifacts({ input, output }: { input: Artifact[]; output: Artifact[] }): Promise<void> {
    const toBeRemoved = input.filter((i) => !output.some((o) => i.path === o.path));
    for (const artifact of toBeRemoved) {
      await rm(artifact.path, { recursive: true, force: true });
    }
  }

  private async copyArtifacts(artifacts: Artifact[]): Promise<Artifact[]> {
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
      const { destinationId, destinationPath } = Generate.tmpDestination(this.env);
      await copyFile(artifact.path, destinationPath);
      result.push({
        ...artifact,
        id: destinationId,
        path: destinationPath,
      });
    }
    return result;
  }

  private formatAdapterError(e: unknown): string {
    if (Exception.isInstance(e)) {
      let details: string = "";
      if (e.details) {
        const { exitCode, stdall } = e.details;
        if (exitCode && stdall) {
          details += `\n\n${stdall}\n(exit ${exitCode})`;
        } else if (e.details.cause) {
          details += `\n\n${e.details.cause}`;
        } else {
          details += ` ${JSON.stringify(e.details, null, 2)}`;
        }
      }
      return `${e.problem}${details}`;
    }
    const message = e instanceof Error ? e.message : String(e);
    return `${ExecutionError.unknown().problem}\n\n${message}`;
  }
}

export namespace ExecutionService {
  export const Create = z
    .object({
      pipelineId: z.string(),
      waitForCompletion: z.boolean().optional(),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
