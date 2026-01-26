import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Pipeline } from "@/models/Pipeline";
import { Step } from "@/models/Step";
import { Test } from "@/testing/Test.test";
import { Temporal } from "@js-temporal/polyfill";
import { beforeEach, describe, expect, it } from "bun:test";
import { ExecutionService } from "./ExecutionService";

describe(ExecutionService.name, async () => {
  let ctx!: Test.Env.Context;
  let service!: ExecutionService;

  beforeEach(async () => {
    ctx = await Test.Env.initialize();
    service = new ExecutionService(ctx.env, ctx.executionRepository, ctx.pipelineRepository, ctx.adapterServiceMock.cast());
  });

  it.only("successfully executes a linear pipeline", async () => {
    // given
    const steps = [Step.Type.postgresql_backup, Step.Type.compression, Step.Type.encryption, Step.Type.s3_upload];
    const pipeline = await ctx.pipelineRepository.create(linearPipeline(steps));
    ctx.adapterServiceMock.submit.mockResolvedValue({
      artifacts: [],
      runtime: {},
    });
    // when
    const { id } = await service.create({ pipelineId: pipeline!.id });
    const completedExecution = await Test.Utils.waitUntil(
      () => ctx.executionRepository.findById(id) as Promise<Execution>,
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
      expect(ctx.adapterServiceMock.submit).toHaveBeenNthCalledWith(
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
    const steps = [Step.Type.postgresql_backup, Step.Type.compression, Step.Type.encryption, Step.Type.s3_upload];
    const pipeline = await ctx.pipelineRepository.create(linearPipeline(steps));
    ctx.adapterServiceMock.submit.mockImplementation((_artifacts, step, _trail) => {
      if (step.type === Step.Type.encryption) {
        return Promise.reject(new Error("Encryption failed for unknown reason"));
      }
      return Promise.resolve({
        artifacts: [],
        runtime: {},
      });
    });
    // when
    const { id } = await service.create({ pipelineId: pipeline!.id });
    const completedExecution = await Test.Utils.waitUntil(
      () => ctx.executionRepository.findById(id) as Promise<Execution>,
      (x) => Boolean(x?.result),
    );
    // then (validate execution and action results)
    expect(completedExecution.result!.outcome).toEqual(Outcome.error);
    expect(completedExecution.result!.completedAt).toBeTruthy();
    expect(completedExecution.result!.duration).toBeTruthy();
    completedExecution.actions.forEach((action) => {
      if (action.stepType === Step.Type.postgresql_backup) {
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
        expect(ctx.adapterServiceMock.submit).toHaveBeenNthCalledWith(
          index + 1,
          expect.anything(),
          expect.objectContaining({
            type,
          }),
          expect.anything(),
        );
      } else {
        expect(ctx.adapterServiceMock.submit).not.toHaveBeenNthCalledWith(
          index + 1,
          expect.anything(),
          expect.anything(),
          expect.anything(),
        );
      }
    });
  });

  it("refuses to execute, if the pipeline is already executing", async () => {
    // given
    await ctx.pipelineRepository.create(
      linearPipeline([], {
        id: "123",
      }),
    );
    await ctx.executionRepository.create({
      id: "X",
      object: "execution",
      pipelineId: "123",
      startedAt: Temporal.Now.plainDateTimeISO(),
      actions: [],
      result: null,
    });
    // when
    const action = () => service.create({ pipelineId: "123" });
    // then
    expect(action()).rejects.toEqual(
      expect.objectContaining({
        problem: "ExecutionError::already_executing",
        details: expect.objectContaining({
          id: "X",
        }),
      }),
    );
  });

  function linearPipeline(steps: Step.Type[], overrides: Partial<Pipeline> = {}): Pipeline {
    return {
      id: "-",
      object: "pipeline",
      name: "my pipeline",
      steps: steps.map((type, index) =>
        Test.Fixture.createStep(type, {
          id: `${index}`,
          previousId: index > 0 ? `${index - 1}` : null,
        }),
      ),
      ...overrides,
    };
  }
});
