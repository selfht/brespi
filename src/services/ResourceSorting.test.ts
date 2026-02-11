import { describe, expect, it } from "bun:test";
import { NotificationService } from "./NotificationService";
import { PipelineService } from "./PipelineService";
import { ScheduleService } from "./ScheduleService";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
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

  const testCases: TestCase[] = [
    {
      type: "pipelines",
      createFn: (index) =>
        pipelineService.create({
          name: `${index}`,
          steps: [TestFixture.createStep(Step.Type.postgresql_backup)],
        }),
      queryFn: () => pipelineService.query(),
      retrieveIndexFn: (resource) => Number((resource as Pipeline).name),
      sortDirectlyFn: (r1, r2) => Pipeline.sortNewToOld(r1 as Pipeline, r2 as Pipeline),
    },
    {
      type: "schedules",
      createFn: (index) =>
        scheduleService.create({
          active: true,
          cron: "* * * * *",
          pipelineId: `${index}`,
        }),
      queryFn: () => scheduleService.query(),
      retrieveIndexFn: (resource) => Number((resource as Schedule).pipelineId),
      sortDirectlyFn: (r1, r2) => Schedule.sortNewToOld(r1 as Schedule, r2 as Schedule),
    },
    {
      type: "policies",
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
  ];
  for (const { type, createFn, queryFn, retrieveIndexFn, sortDirectlyFn } of testCases) {
    it(`queries '${type}' from new to old`, async () => {
      // given
      const range = { min: 0, max: 49 } as const;
      for (let i = range.min; i <= range.max; i++) {
        await createFn(i);
      }
      // when
      const queriedResults = await queryFn();
      const sortedResults = queriedResults.toSorted(sortDirectlyFn);
      for (let i = range.min; i <= range.max; i++) {
        // then
        expect(retrieveIndexFn(queriedResults[i])).toEqual(range.max - i);
        expect(retrieveIndexFn(sortedResults[i])).toEqual(range.max - i);
      }
    });
  }
});
