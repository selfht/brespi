import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Temporal } from "@js-temporal/polyfill";

export namespace ExecutionData {
  const time1 = Temporal.Now.plainDateTimeISO().subtract({ days: 1 });
  const time2 = Temporal.Now.plainDateTimeISO().subtract({ days: 2 });
  const time3 = Temporal.Now.plainDateTimeISO().subtract({ days: 3 });
  const duration = Temporal.Duration.from({ seconds: Math.round(200 + Math.random() * 400) });

  export const PENDING = (pipelineId: string): Execution => ({
    id: Bun.randomUUIDv7(),
    pipelineId,
    startedAt: time1,
    actions: [],
    result: null,
  });

  export const SUCCESS = (pipelineId: string): Execution => ({
    id: Bun.randomUUIDv7(),
    pipelineId,
    startedAt: time2,
    actions: [],
    result: {
      outcome: Outcome.success,
      duration,
      completedAt: time2.add(duration),
    },
  });

  export const ERROR = (pipelineId: string): Execution => ({
    id: Bun.randomUUIDv7(),
    pipelineId,
    startedAt: time3,
    actions: [],
    result: {
      outcome: Outcome.error,
      duration,
      completedAt: time3.add(duration),
    },
  });
}
