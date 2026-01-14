import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type Schedule = Schedule.Core & {
  active: boolean;
};

export namespace Schedule {
  export const parse = ZodParser.forType<Schedule>()
    .ensureSchemaMatchesType(() =>
      Core.parse.SCHEMA.and(
        z.object({
          active: z.boolean(),
        }),
      ),
    )
    .ensureTypeMatchesSchema();

  export type Core = {
    id: string;
    object: "schedule";
    pipelineId: string;
    cron: string;
  };
  export namespace Core {
    export const parse = ZodParser.forType<Core>()
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

  export type Metadata = {
    id: string;
    object: "schedule.metadata";
    active: boolean;
  };
}
