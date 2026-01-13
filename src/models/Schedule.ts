import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { CoreSchedule } from "./CoreSchedule";

export type Schedule = CoreSchedule & {
  active: boolean;
};

export namespace Schedule {
  export const parse = ZodParser.forType<Schedule>()
    .ensureSchemaMatchesType(() =>
      CoreSchedule.parse.SCHEMA.and(
        z.object({
          active: z.boolean(),
        }),
      ),
    )
    .ensureTypeMatchesSchema();
}
