import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { CoreConfiguration } from "./CoreConfiguration";

export type Configuration = CoreConfiguration & {
  synchronized: boolean;
};

export namespace Configuration {
  export const parse = ZodParser.forType<Configuration>()
    .ensureSchemaMatchesType(() => {
      return CoreConfiguration.parse.SCHEMA.and(
        z.object({
          synchronized: z.boolean(),
        }),
      );
    })
    .ensureTypeMatchesSchema();
}
