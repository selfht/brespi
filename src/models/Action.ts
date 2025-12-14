import { Temporal } from "@js-temporal/polyfill";
import { Outcome } from "./Outcome";
import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type Action = {
  stepId: string;
  previousStepId: string | null;
  stepType: string;
  outcome: Outcome;
  duration: Temporal.Duration;
  artifactsConsumed: number;
  artifactsProduced: number;
  failures: Action.Failure[];
};

export namespace Action {
  export type Failure = {
    problem: string;
    message: string | null;
  };

  export const parse = ZodParser.forType<Action>()
    .ensureSchemaMatchesType(
      z.object({
        stepId: z.string(),
        previousStepId: z.string().nullable(),
        stepType: z.string(),
        outcome: z.enum(Outcome),
        duration: z.string().transform(Temporal.Duration.from),
        artifactsConsumed: z.number(),
        artifactsProduced: z.number(),
        failures: z.array(
          z.object({
            problem: z.string(),
            message: z.string().nullable(),
          }),
        ),
      }),
    )
    .ensureTypeMatchesSchema();
}
