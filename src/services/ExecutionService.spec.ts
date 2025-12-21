import { Test } from "@/helpers/Test.spec";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { beforeEach, describe, expect, it } from "bun:test";
import { ExecutionService } from "./ExecutionService";
import { Temporal } from "@js-temporal/polyfill";
import { Env } from "@/Env";

describe(ExecutionService.name, () => {
  const { inMemoryExecutionRepository, inMemoryPipelineRepository } = Test.RepoRegistry;
  const { adapterService } = Test.MockRegistry;
  const service = new ExecutionService(
    { X_BRESPI_ARTIFICIAL_STEP_EXECUTION_DELAY: Temporal.Duration.from({ seconds: 0 }) } as Env.Private,
    inMemoryExecutionRepository,
    inMemoryPipelineRepository,
    Test.impl(adapterService),
  );

  beforeEach(() => {
    inMemoryPipelineRepository.clear();
    inMemoryExecutionRepository.clear();
  });

  it("initializes", () => {
    expect(service).toBeDefined();
  });

  it("executes a simple linear pipeline", async () => {
    // given
    const pipeline = await inMemoryPipelineRepository.create(linearPipeline());
    // when
    await service.create({ pipelineId: pipeline!.id });
    // TODO
    // TODO
    // TODO
  });

  function linearPipeline(): Pipeline {
    return {
      id: "-",
      object: "pipeline",
      name: "my pipeline",
      steps: [
        {
          id: "A",
          previousId: null,
          object: "step",
          type: Step.Type.postgres_backup,
          databaseSelection: {
            strategy: "all",
          },
        },
        {
          id: "B",
          previousId: "A",
          object: "step",
          type: Step.Type.compression,
          algorithm: {
            implementation: "targzip",
            level: 9,
          },
        },
        {
          id: "C",
          previousId: "B",
          object: "step",
          type: Step.Type.encryption,
          keyReference: "MY_KEY",
          algorithm: {
            implementation: "aes256cbc",
          },
        },
        {
          id: "D",
          previousId: "C",
          object: "step",
          type: Step.Type.s3_upload,
          baseFolder: "/backups",
          accessKeyReference: "AK",
          secretKeyReference: "SK",
        },
      ],
    };
  }
});
