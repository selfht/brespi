import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod/v4";

export type Execution = {
  id: string;
  pipelineId: string;
  outcome: Execution.Outcome;
  duration: Temporal.Duration;
  startedAt: Temporal.PlainDateTime;
  completedAt: Temporal.PlainDateTime;
};

export namespace Execution {
  export enum Outcome {
    success = "success",
    error = "error",
  }

  export const parse = ZodParser.forType<Execution>()
    .ensureSchemaMatchesType(
      z.object({
        id: z.string(),
        pipelineId: z.string(),
        outcome: z.enum(Outcome),
        duration: z.string().transform(Temporal.Duration.from),
        startedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
        completedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
      }),
    )
    .ensureTypeMatchesSchema();
}
