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
