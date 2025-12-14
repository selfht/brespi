import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { PipelineError } from "@/errors/PipelineError";
import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Artifact } from "@/models/Artifact";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { Temporal } from "@js-temporal/polyfill";
import { exec } from "child_process";
import { rm } from "fs/promises";
import z from "zod/v4";

export class ExecutionService {
  public constructor(
    private readonly repository: ExecutionRepository,
    private readonly pipelineRepository: PipelineRepository,
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

  public async create(unknown: unknown): Promise<Execution> {
    const { pipelineId } = ExecutionService.CreateExecutionRequest.parse(unknown);
    const execution: Execution = {
      id: Bun.randomUUIDv7(),
      pipelineId,
      startedAt: Temporal.Now.plainDateTimeISO(),
      actions: [],
      result: null,
    };
    const pipeline = await this.pipelineRepository.find(pipelineId);
    if (!pipeline) {
      throw PipelineError.not_found();
    }
    if (!(await this.repository.create(execution))) {
      throw ExecutionError.already_exists();
    }
    this.execute(execution.id, pipeline); // no await, to turn it into a background task (?)
    return execution;
  }

  private async execute(executionId: string, pipeline: Pipeline): Promise<void> {
    let artifacts: Artifact[] = [];
    for (let index = 0; index < pipeline.steps.length; index++) {
      const step = pipeline.steps[index];
      const trail = pipeline.steps.slice(0, index + 1);
      const newArtifacts = await this.adapterService.submit(artifacts, step, trail);
      await this.cleanup(artifacts);
      artifacts = newArtifacts;
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
