import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Step } from "./Step";

export type Pipeline = {
  id: string;
  object: "pipeline";
  name: string;
  steps: Step[];
};

export namespace Pipeline {
  export const parse = ZodParser.forType<Pipeline>()
    .ensureSchemaMatchesType(
      z.object({
        id: z.string(),
        object: z.literal("pipeline"),
        name: z.string(),
        steps: z.array(Step.parse.SCHEMA),
      }),
    )
    .ensureTypeMatchesSchema();
}
