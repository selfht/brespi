import { Test } from "@/testing/Test.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { ScheduleService } from "./ScheduleService";

describe(ScheduleService.name, async () => {
  const { eventBus, scheduleRepository, pipelineRepository, executionService } = await Test.initializeMockRegistry();
  const service = new ScheduleService(Test.impl(eventBus), scheduleRepository, pipelineRepository, Test.impl(executionService));

  beforeEach(async () => {
    await Test.cleanup();
  });

  it.each([
    "", // empty
    "potato", // ridiculous
    "* * * *", // too few fields
    "* * * * * * *", // too many fields
    "60 * * * *", // minute out of range (0-59)
    "* 24 * * *", // hour out of range (0-23)
    "* * 32 * *", // day out of range (1-31)
    "* * * 13 *", // month out of range (1-12)
    "foo bar baz qux quux", // ridiculous
    "*/0 * * * *", // division by zero
    "1-60 * * * *", // range exceeds max
    "** * * * *", // invalid syntax
    "! @ # $ %", // ridiculous
  ])("rejects invalid cron expression: %s", async (invalidCron) => {
    // given
    const pipeline = await pipelineRepository.create({
      id: Bun.randomUUIDv7(),
      object: "pipeline",
      name: "Irrelevant",
      steps: [],
    });
    // when
    const action = () =>
      service.create({
        pipelineId: pipeline.id,
        active: true,
        cron: invalidCron,
      });
    // then
    expect(action()).rejects.toEqual(
      expect.objectContaining({
        problem: "ScheduleError::invalid_cron_expression",
      }),
    );
  });
});
