import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Step } from "./Step";

export type Pipeline = {
  id: string;
  name: string;
  steps: Step[];
};

export namespace Pipeline {
  export const parse = ZodParser.forType<Pipeline>()
    .ensureSchemaMatchesType(
      z.object({
        id: z.string(),
        name: z.string(),
        steps: z.array(Step.parse.SCHEMA),
      }),
    )
    .ensureTypeMatchesSchema();
}
