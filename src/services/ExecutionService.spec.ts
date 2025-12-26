import { Test } from "@/helpers/Test.spec";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "bun:test";
import { ExecutionService } from "./ExecutionService";
import { Outcome } from "@/models/Outcome";
import { Action } from "@/models/Action";
import { StepData } from "@/__testdata__/StepData";

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
    const steps = [Step.Type.postgres_backup, Step.Type.compression, Step.Type.encryption, Step.Type.s3_upload];
    const pipeline = await inMemoryPipelineRepository.create(linearPipeline(steps));
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
    steps.forEach((type, index) => {
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

  function linearPipeline(steps: Step.Type[]): Pipeline {
    return {
      id: "-",
      object: "pipeline",
      name: "my pipeline",
      steps: steps.map((type, index) =>
        StepData.createStep(type, {
          id: `${index}`,
          previousId: index > 0 ? `${index - 1}` : null,
        }),
      ),
    };
  }
});
