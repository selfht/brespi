import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Pipeline } from "./Pipeline";

export type Configuration = {
  pipelines: Pipeline[];
};

export namespace Configuration {
  export function empty(): Configuration {
    return {
      pipelines: [],
    };
  }

  export const parse = ZodParser.forType<Configuration>()
    .ensureSchemaMatchesType(() => {
      return z.object({
        pipelines: z.array(Pipeline.parse.SCHEMA),
      });
    })
    .ensureTypeMatchesSchema();
}
