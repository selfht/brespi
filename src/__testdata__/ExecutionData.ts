import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Step } from "@/models/Step";
import { Temporal } from "@js-temporal/polyfill";

export namespace ExecutionData {
  const time1 = Temporal.Now.plainDateTimeISO().subtract({ days: 1 });
  const time2 = Temporal.Now.plainDateTimeISO().subtract({ days: 2 });
  const time3 = Temporal.Now.plainDateTimeISO().subtract({ days: 3 });
  const randomDuration = () =>
    Temporal.Duration.from({
      seconds: -Math.round(Math.random() * 500_000),
    });

  export const PENDING = (pipelineId: string): Execution => {
    return {
      id: Bun.randomUUIDv7(),
      pipelineId,
      startedAt: time1,
      actions: [],
      result: null,
    };
  };

  export const SUCCESS = (pipelineId: string): Execution => {
    const duration = randomDuration();
    return {
      id: Bun.randomUUIDv7(),
      pipelineId,
      startedAt: time2,
      actions: [
        {
          stepId: "A",
          previousStepId: null,
          stepType: Step.Type.postgres_backup,
          startedAt: time2,
          result: {
            outcome: Outcome.success,
            duration,
            completedAt: time2.add(duration),
            consumed: [],
            produced: [
              { name: "bakingworld.sql", type: "file" },
              { name: "gamingworld.sql", type: "file" },
            ],
            failure: null,
          },
        },
        {
          stepId: "B",
          previousStepId: "A",
          stepType: Step.Type.compression,
          startedAt: time2,
          result: {
            outcome: Outcome.success,
            duration,
            completedAt: time2.add(duration),
            consumed: [
              { name: "bakingworld.sql", type: "file" },
              { name: "gamingworld.sql", type: "file" },
            ],
            produced: [
              { name: "bakingworld.sql.tar.gz", type: "file" },
              { name: "gamingworld.sql.tar.gz", type: "file" },
            ],
            failure: null,
          },
        },
        {
          stepId: "C",
          previousStepId: "B",
          stepType: Step.Type.s3_upload,
          startedAt: time2,
          result: {
            outcome: Outcome.success,
            duration,
            completedAt: time2.add(duration),
            consumed: [
              { name: "bakingworld.sql.tar.gz", type: "file" },
              { name: "gamingworld.sql.tar.gz", type: "file" },
            ],
            produced: [],
            failure: null,
          },
        },
      ],
      result: {
        outcome: Outcome.success,
        duration,
        completedAt: time2.add(duration),
      },
    };
  };

  export const ERROR = (pipelineId: string): Execution => {
    const duration = randomDuration();
    return {
      id: Bun.randomUUIDv7(),
      pipelineId,
      startedAt: time3,
      actions: [],
      result: {
        outcome: Outcome.error,
        duration,
        completedAt: time3.add(duration),
      },
    };
  };
}
