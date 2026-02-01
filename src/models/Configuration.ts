import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { NotificationPolicy } from "./NotificationPolicy";
import { Pipeline } from "./Pipeline";
import { Schedule } from "./Schedule";

export type Configuration = Configuration.Core & {
  synchronized: boolean;
};

export namespace Configuration {
  export type Core = {
    pipelines: Pipeline[];
    schedules: Schedule.Core[];
    notificationPolicies: NotificationPolicy[];
  };
  export namespace Core {
    export function empty(): Core {
      return {
        pipelines: [],
        schedules: [],
        notificationPolicies: [],
      };
    }
    export const parse = ZodParser.forType<Core>()
      .ensureSchemaMatchesType(() =>
        z.object({
          pipelines: z.array(Pipeline.parse.SCHEMA),
          schedules: z.array(Schedule.Core.parse.SCHEMA),
          notificationPolicies: z.array(NotificationPolicy.parse.SCHEMA),
        }),
      )
      .ensureTypeMatchesSchema();
  }

  export const parse = ZodParser.forType<Configuration>()
    .ensureSchemaMatchesType(() => {
      return Core.parse.SCHEMA.and(
        z.object({
          synchronized: z.boolean(),
        }),
      );
    })
    .ensureTypeMatchesSchema();
}
