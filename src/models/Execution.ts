import { Parser } from "@/parsing/Parser";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod/v4";

export type Execution = {
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

  export const parse = Parser.forType<Execution>()
    .withSchema(
      z.object({
        outcome: z.enum(Outcome),
        duration: z.string().transform(Temporal.Duration.from),
        startedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
        completedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
      }),
    )
    .ensureTypeEquivalence();
}
