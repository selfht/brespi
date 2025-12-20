import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";
import { Artifact } from "./Artifact";
import { Outcome } from "./Outcome";

export type Action = {
  stepId: string;
  previousStepId: string | null;
  stepType: string;
  startedAt: Temporal.PlainDateTime | null;
  result: {
    outcome: Outcome;
    duration: Temporal.Duration;
    completedAt: Temporal.PlainDateTime;
    consumed: Action.ArtifactSummary[];
    produced: Action.ArtifactSummary[];
    failure: Action.Failure | null;
  } | null;
};

export namespace Action {
  export type ArtifactSummary = Pick<Artifact, "type" | "name">;
  export type Failure = {
    problem: string;
    message: string | null;
  };

  const subschema = {
    artifactSummary: z.object({
      name: z.string(),
      type: z.union([z.literal("file"), z.literal("directory")]),
    }) satisfies z.ZodType<ArtifactSummary>,
    failure: z.object({
      problem: z.string(),
      message: z.string().nullable(),
    }) satisfies z.ZodType<Failure>,
  };
  export const parse = ZodParser.forType<Action>()
    .ensureSchemaMatchesType(
      z.object({
        stepId: z.string(),
        previousStepId: z.string().nullable(),
        stepType: z.string(),
        startedAt: z
          .string()
          .transform((x) => Temporal.PlainDateTime.from(x))
          .nullable(),
        result: z
          .object({
            outcome: z.enum(Outcome),
            duration: z.string().transform(Temporal.Duration.from),
            completedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
            consumed: z.array(subschema.artifactSummary),
            produced: z.array(subschema.artifactSummary),
            failure: subschema.failure.nullable(),
          })
          .nullable(),
      }),
    )
    .ensureTypeMatchesSchema();
}
