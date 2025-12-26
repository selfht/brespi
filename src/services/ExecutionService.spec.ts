import { Test } from "@/helpers/Test.spec";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "bun:test";
import { ExecutionService } from "./ExecutionService";
import { Outcome } from "@/models/Outcome";
import { Action } from "@/models/Action";

describe(ExecutionService.name, async () => {
  const { inMemoryExecutionRepository, inMemoryPipelineRepository } = Test.RepoRegistry;
  const { adapterService } = Test.MockRegistry;
  const service = new ExecutionService(
    await Test.env({
      X_BRESPI_ARTIFICIAL_STEP_EXECUTION_DELAY: Temporal.Duration.from({ seconds: 0 }),
    }),
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
    adapterService.submit.mockResolvedValue({
      artifacts: [],
      runtimeInformation: {},
    });
    const pipeline = await inMemoryPipelineRepository.create(linearPipeline());
    // when
    const { id } = await service.create({ pipelineId: pipeline!.id });
    const completedExecution = await Test.waitUntil(
      () => inMemoryExecutionRepository.findById(id) as Promise<Execution>,
      (x) => Boolean(x?.result),
    );
    // then (validate results)
    completedExecution.actions.forEach((action) => {
      expect(action.result?.outcome).toEqual(Outcome.success);
      expect(action.result?.completedAt).toBeTruthy();
      expect(action.result?.duration).toBeTruthy();
    });
    expect(completedExecution.result?.outcome).toEqual(Outcome.success);
    expect(completedExecution.result?.completedAt).toBeTruthy();
    expect(completedExecution.result?.duration).toBeTruthy();
    // then (expectedAdapterInvocations)
    [Step.Type.postgres_backup, Step.Type.compression, Step.Type.encryption, Step.Type.s3_upload].forEach((type, index) => {
      expect(adapterService.submit).toHaveBeenNthCalledWith(
        index + 1,
        expect.anything(),
        expect.objectContaining({
          type,
        }),
        expect.anything(),
      );
    });
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
          connectionReference: "DATABASE_URL",
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
          bucketReference: "s3+http://AK:SK@localhost/my-bucket",
          baseFolder: "/backups",
        },
      ],
    };
  }
});
