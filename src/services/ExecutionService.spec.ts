import { StepData } from "@/__testdata__/StepData";
import { Test } from "@/helpers/Test.spec";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "bun:test";
import { ExecutionService } from "./ExecutionService";

describe(ExecutionService.name, async () => {
  const { executionRepository, pipelineRepository, adapterService, resetAllMocks } = await Test.initializeMockRegistry();

  const service = new ExecutionService(
    await Test.env({
      X_BRESPI_ARTIFICIAL_STEP_EXECUTION_DELAY: Temporal.Duration.from({ seconds: 0 }),
    }),
    executionRepository,
    pipelineRepository,
    Test.impl(adapterService),
  );

  beforeEach(async () => {
    resetAllMocks();
    await pipelineRepository.removeAll();
    await executionRepository.removeAll();
  });

  it("successfully executes a linear pipeline", async () => {
    // given
    const steps = [Step.Type.postgres_backup, Step.Type.compression, Step.Type.encryption, Step.Type.s3_upload];
    const pipeline = await pipelineRepository.create(linearPipeline(steps));
    adapterService.submit.mockResolvedValue({
      artifacts: [],
      runtimeInformation: {},
    });
    // when
    const { id } = await service.create({ pipelineId: pipeline!.id });
    const completedExecution = await Test.waitUntil(
      () => executionRepository.findById(id) as Promise<Execution>,
      (x) => Boolean(x?.result),
    );
    // then (validate execution and action results)
    expect(completedExecution.result!.outcome).toEqual(Outcome.success);
    expect(completedExecution.result!.completedAt).toBeTruthy();
    expect(completedExecution.result!.duration).toBeTruthy();
    completedExecution.actions.forEach((action) => {
      expect(action.result!.outcome).toEqual(Outcome.success);
      expect(action.result!.errorMessage).toBeFalsy();
      expect(action.result!.completedAt).toBeTruthy();
      expect(action.result!.duration).toBeTruthy();
    });
    // then (validate adapter invocations)
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

  it("fails to execute a linear pipeline if there are errors", async () => {
    // given
    const steps = [Step.Type.postgres_backup, Step.Type.compression, Step.Type.encryption, Step.Type.s3_upload];
    const pipeline = await pipelineRepository.create(linearPipeline(steps));
    adapterService.submit.mockImplementation((_artifacts, step, _trail) => {
      if (step.type === Step.Type.encryption) {
        return Promise.reject(new Error("Encryption failed for unknown reason"));
      }
      return Promise.resolve({
        artifacts: [],
        runtimeInformation: {},
      });
    });
    // when
    const { id } = await service.create({ pipelineId: pipeline!.id });
    const completedExecution = await Test.waitUntil(
      () => executionRepository.findById(id) as Promise<Execution>,
      (x) => Boolean(x?.result),
    );
    // then (validate execution and action results)
    expect(completedExecution.result!.outcome).toEqual(Outcome.error);
    expect(completedExecution.result!.completedAt).toBeTruthy();
    expect(completedExecution.result!.duration).toBeTruthy();
    completedExecution.actions.forEach((action) => {
      if (action.stepType === Step.Type.postgres_backup) {
        expect(action.result!.outcome).toEqual(Outcome.success);
        expect(action.result!.errorMessage).toBeFalsy();
        expect(action.result!.completedAt).toBeTruthy();
        expect(action.result!.duration).toBeTruthy();
      }
      if (action.stepType === Step.Type.compression) {
        expect(action.result!.outcome).toEqual(Outcome.success);
        expect(action.result!.errorMessage).toBeFalsy();
        expect(action.result!.completedAt).toBeTruthy();
        expect(action.result!.duration).toBeTruthy();
      }
      if (action.stepType === Step.Type.encryption) {
        expect(action.result!.outcome).toEqual(Outcome.error);
        expect(action.result!.errorMessage).toEqual("ExecutionError::unknown\n\nEncryption failed for unknown reason");
        expect(action.result!.completedAt).toBeTruthy();
        expect(action.result!.duration).toBeTruthy();
      }
      if (action.stepType === Step.Type.s3_upload) {
        expect(action.result).toBeFalsy();
      }
    });
    // then (validate adapter invocations)
    steps.forEach((type, index) => {
      if (index <= 2) {
        expect(adapterService.submit).toHaveBeenNthCalledWith(
          index + 1,
          expect.anything(),
          expect.objectContaining({
            type,
          }),
          expect.anything(),
        );
      } else {
        expect(adapterService.submit).not.toHaveBeenNthCalledWith(index + 1, expect.anything(), expect.anything(), expect.anything());
      }
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
