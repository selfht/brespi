import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { CoreSchedule } from "./CoreSchedule";
import { Pipeline } from "./Pipeline";

export type CoreConfiguration = {
  pipelines: Pipeline[];
  schedules: CoreSchedule[];
};

export namespace CoreConfiguration {
  export function empty(): CoreConfiguration {
    return {
      pipelines: [],
      schedules: [],
    };
  }

  export const parse = ZodParser.forType<CoreConfiguration>()
    .ensureSchemaMatchesType(() => {
      return z.object({
        pipelines: z.array(Pipeline.parse.SCHEMA),
        schedules: z.array(CoreSchedule.parse.SCHEMA),
      });
    })
    .ensureTypeMatchesSchema();
}
