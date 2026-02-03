import { describe, expect, it } from "bun:test";
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

type TestCase = {
  type: string;
  createFn: (index: number) => Promise<unknown>;
  queryFn: () => Promise<unknown[]>;
  retrieveIndexFn: (resource: unknown) => number;
  sortDirectlyFn: (r1: unknown, r2: unknown) => number;
};

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
      createFn: (index) => pipelineService.create({ name: `${index}`, steps: [TestFixture.createStep(Step.Type.postgresql_backup)] }),
      queryFn: () => pipelineService.query(),
      retrieveIndexFn: (resource) => Number((resource as Pipeline).name),
      sortDirectlyFn: (r1, r2) => Pipeline.sortNewToOld(r1 as Pipeline, r2 as Pipeline),
    },
    {
      type: "schedules",
      createFn: (index) => scheduleService.create({ active: true, cron: "* * * * *", pipelineId: `${index}` }),
      queryFn: () => scheduleService.query(),
      retrieveIndexFn: (resource) => Number((resource as Schedule).pipelineId),
      sortDirectlyFn: (r1, r2) => Schedule.sortNewToOld(r1 as Schedule, r2 as Schedule),
    },
    {
      type: "notificationPolicies",
      createFn: (index) =>
        notificationService.createPolicy({
          active: true,
          channel: { type: "custom_script", path: `${index}` },
          eventSubscriptions: [],
        }),
      queryFn: () => notificationService.queryPolicies(),
      retrieveIndexFn: (resource) => Number(((resource as NotificationPolicy).channel as NotificationChannel.CustomScript).path),
      sortDirectlyFn: (r1, r2) => NotificationPolicy.sortNewToOld(r1 as NotificationPolicy, r2 as NotificationPolicy),
    },
  ]);
  it.each(collection.testCases)("queries '%s' from new to old", async (tc) => {
    const { createFn, queryFn, retrieveIndexFn, sortDirectlyFn } = collection.get(tc);
    // given
    const count = 50;
    for (let i = 0; i < count; i++) {
      await createFn(i);
    }
    // when
    const queryResults = await queryFn();
    const sortResults = queryResults.toSorted(sortDirectlyFn);
    for (let i = 0; i < count; i++) {
      // then
      expect(retrieveIndexFn(queryResults[i])).toEqual(count - 1 - i);
      expect(retrieveIndexFn(sortResults[i])).toEqual(count - 1 - i);
    }
  });
});
