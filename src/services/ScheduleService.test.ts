import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { ScheduleService } from "./ScheduleService";

describe(ScheduleService.name, async () => {
  let context!: TestEnvironment.Context;
  let service!: ScheduleService;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    service = new ScheduleService(
      context.eventBusMock.cast(),
      context.scheduleRepository,
      context.pipelineRepository,
      context.executionServiceMock.cast(),
    );
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
    const pipeline = await context.pipelineRepository.create({
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
