import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod/v4";
import { Outcome } from "./Outcome";
import { Action } from "./Action";

export type Execution = {
  id: string;
  pipelineId: string;
  startedAt: Temporal.PlainDateTime;
  actions: Action[];
  result: {
    outcome: Outcome;
    duration: Temporal.Duration;
    completedAt: Temporal.PlainDateTime;
  } | null;
};

export namespace Execution {
  /**
   * 1. Executions without a `result` rank first
   * 2. If there are multiple such executions, we compare on `startedAt`, where the most recent timestamp ranks first
   * 3. Otherwise, we compare on `result.completedAt`, where the most recent timestamp ranks first
   */
  export const sort = (e1: Execution, e2: Execution): number => {
    // Executions without result come first
    if (e1.result && !e2.result) {
      return 1;
    }
    if (!e1.result && e2.result) {
      return -1;
    }
    // Both have no result: sort by most recent startedAt first
    if (!e1.result && !e2.result) {
      return Temporal.PlainDateTime.compare(e2.startedAt, e1.startedAt);
    }
    // Both have results: sort by most recent completedAt first
    return Temporal.PlainDateTime.compare(e2.result!.completedAt, e1.result!.completedAt);
  };

  export const parse = ZodParser.forType<Execution>()
    .ensureSchemaMatchesType(
      z.object({
        id: z.string(),
        pipelineId: z.string(),
        startedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
        actions: z.array(Action.parse.SCHEMA),
        result: z
          .object({
            duration: z.string().transform(Temporal.Duration.from),
            outcome: z.enum(Outcome),
            completedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
          })
          .nullable(),
      }),
    )
    .ensureTypeMatchesSchema();
}
