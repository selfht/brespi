import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type CoreSchedule = {
  id: string;
  object: "schedule";
  pipelineId: string;
  cron: string;
};

export namespace CoreSchedule {
  export const parse = ZodParser.forType<CoreSchedule>()
    .ensureSchemaMatchesType(() =>
      z.object({
        id: z.string(),
        object: z.literal("schedule"),
        pipelineId: z.string(),
        cron: z.string(),
      }),
    )
    .ensureTypeMatchesSchema();
}
