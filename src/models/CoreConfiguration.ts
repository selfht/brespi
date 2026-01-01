import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Pipeline } from "./Pipeline";

export type CoreConfiguration = {
  pipelines: Pipeline[];
};

export namespace CoreConfiguration {
  export function empty(): CoreConfiguration {
    return {
      pipelines: [],
    };
  }

  export const parse = ZodParser.forType<CoreConfiguration>()
    .ensureSchemaMatchesType(() => {
      return z.object({
        pipelines: z.array(Pipeline.parse.SCHEMA),
      });
    })
    .ensureTypeMatchesSchema();
}
