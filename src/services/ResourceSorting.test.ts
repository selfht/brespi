import { Class } from "@/types/Class";
import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { NotificationService } from "./NotificationService";
import { PipelineService } from "./PipelineService";
import { ScheduleService } from "./ScheduleService";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestUtils } from "@/testing/TestUtils.test";
import { NotificationChannel } from "@/models/NotificationChannel";
import { TestFixture } from "@/testing/TestFixture.test";
import { Step } from "@/models/Step";
import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { NotificationPolicy } from "@/models/NotificationPolicy";

type TestCaseBuilder<T extends string, C extends Class, CF extends keyof InstanceType<C>, QF extends keyof InstanceType<C>> = {
  type: T;
  createInputFn: (index: number) => Parameters<InstanceType<C>[CF]>[0];
  parseInputFn: (resource: Awaited<ReturnType<InstanceType<C>[CF]>>) => number;
  createFn: InstanceType<C>[CF];
  queryFn: InstanceType<C>[QF];
  sortFn: (r1: Awaited<ReturnType<InstanceType<C>[CF]>>, r2: Awaited<ReturnType<InstanceType<C>[CF]>>) => number;
};
type TestCase =
  | TestCaseBuilder<"pipelines", typeof PipelineService, "create", "query">
  | TestCaseBuilder<"schedules", typeof ScheduleService, "create", "query">
  | TestCaseBuilder<"notificationPolicies", typeof NotificationService, "createPolicy", "queryPolicies">;

describe("resource sorting", async () => {
  const context = await TestEnvironment.initialize();
  const pipelineService = new PipelineService(
    context.eventBus,
    context.pipelineRepository,
    context.executionRepository,
    context.stepServiceMock.cast(),
  );
  const scheduleService = new ScheduleService(
    context.eventBus,
    context.scheduleRepository,
    context.pipelineRepositoryMock.cast(),
    context.executionServiceMock.cast(),
  );
  context.pipelineRepositoryMock.findById.mockResolvedValue({} as Pipeline);
  const notificationService = new NotificationService(
    context.eventBus,
    context.notificationRepository,
    context.notificationDispatchServiceMock.cast(),
  );

  const collection = TestUtils.createCollection<TestCase>("type", [
    {
      type: "pipelines",
      createInputFn: (index) => ({ name: `${index}`, steps: [TestFixture.createStep(Step.Type.postgresql_backup)] }),
      parseInputFn: (resource) => Number(resource.name),
      createFn: (input) => pipelineService.create(input),
      queryFn: () => pipelineService.query(),
      sortFn: Pipeline.sortNewToOld,
    },
    {
      type: "schedules",
      createInputFn: (index) => ({ active: true, cron: "* * * * *", pipelineId: `${index}` }),
      parseInputFn: (resource) => Number(resource.pipelineId),
      createFn: (input) => scheduleService.create(input),
      queryFn: () => scheduleService.query(),
      sortFn: Schedule.sortNewToOld,
    },
    {
      type: "notificationPolicies",
      createInputFn: (index) => ({ active: true, channel: { type: "custom_script", path: `${index}` }, eventSubscriptions: [] }),
      parseInputFn: (resource) => Number((resource.channel as NotificationChannel.CustomScript).path),
      createFn: (input) => notificationService.createPolicy(input),
      queryFn: () => notificationService.queryPolicies(),
      sortFn: NotificationPolicy.sortNewToOld,
    },
  ]);
  it.each(collection.testCases)("queries '%s' from new to old", async (tc) => {
    const testCase = collection.get(tc);
    // given
    const range = { min: 0, max: 49 } as const;
    for (let i = range.min; i <= range.max; i++) {
      // when
      switch (testCase.type) {
        case "pipelines": {
          await testCase.createFn(testCase.createInputFn(i));
          break;
        }
        case "schedules": {
          await testCase.createFn(testCase.createInputFn(i));
          break;
        }
        case "notificationPolicies": {
          await testCase.createFn(testCase.createInputFn(i));
          break;
        }
        default: {
          testCase satisfies never;
        }
      }
    }
    // then
    for (let i = range.min; i <= range.max; i++) {
      switch (testCase.type) {
        case "pipelines": {
          const results = await testCase.queryFn();
          const markerProperty = testCase.parseInputFn(results[i]);
          expect(markerProperty).toEqual(range.max - i);
          break;
        }
        case "schedules": {
          const results = await testCase.queryFn();
          const markerProperty = testCase.parseInputFn(results[i]);
          expect(markerProperty).toEqual(range.max - i);
          break;
        }
        case "notificationPolicies": {
          const results = await testCase.queryFn();
          const markerProperty = testCase.parseInputFn(results[i]);
          expect(markerProperty).toEqual(range.max - i);
          break;
        }
        default: {
          testCase satisfies never;
        }
      }
    }
  });
});
