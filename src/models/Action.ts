import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";
import { Artifact } from "./Artifact";
import { Outcome } from "./Outcome";

export type Action = {
  id: string;
  object: "action";
  executionId: string;
  stepId: string;
  stepType: string;
  previousStepId?: string;
  startedAt?: Temporal.PlainDateTime;
  result?: {
    outcome: Outcome;
    duration: Temporal.Duration;
    completedAt: Temporal.PlainDateTime;
    consumed: Action.ArtifactSummary[];
    produced: Action.ArtifactSummary[];
    errorMessage?: string;
  };
};

export namespace Action {
  export type ArtifactSummary = Pick<Artifact, "type" | "name">;

  const artifactSummarySchema: z.ZodType<ArtifactSummary> = z.object({
    name: z.string(),
    type: z.union([z.literal("file"), z.literal("directory")]),
  });
  export const parse = ZodParser.forType<Action>()
    .ensureSchemaMatchesType(() =>
      z.object({
        id: z.string(),
        object: z.literal("action"),
        executionId: z.string(),
        stepId: z.string(),
        stepType: z.string(),
        previousStepId: z.string().optional(),
        startedAt: z
          .string()
          .transform((x) => Temporal.PlainDateTime.from(x))
          .optional(),
        result: z
          .object({
            outcome: z.enum(Outcome),
            duration: z.string().transform(Temporal.Duration.from),
            completedAt: z.string().transform((x) => Temporal.PlainDateTime.from(x)),
            consumed: z.array(artifactSummarySchema),
            produced: z.array(artifactSummarySchema),
            errorMessage: z.string().optional(),
          })
          .optional(),
      }),
    )
    .ensureTypeMatchesSchema();
}
