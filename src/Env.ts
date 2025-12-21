import { Temporal } from "@js-temporal/polyfill";
import { join } from "path";
import { z } from "zod/v4";

export namespace Env {
  export function initialize(): Readonly<ReturnType<typeof readAndValidateEnvironment>> {
    return readAndValidateEnvironment();
  }
  function readAndValidateEnvironment() {
    return z
      .object({
        O_BRESPI_STAGE: z.enum(["development", "production"]),
        X_BRESPI_ROOT: z.string(),
      })
      .transform((env) => ({
        ...env,
        X_BRESPI_TMP_ROOT: join(env.X_BRESPI_ROOT, "tmp"),
        X_BRESPI_DATA_ROOT: join(env.X_BRESPI_ROOT, "data"),
        X_BRESPI_ARTIFICIAL_STEP_EXECUTION_DELAY: Temporal.Duration.from({
          seconds: env.O_BRESPI_STAGE === "development" ? 2 : 0,
        }),
      }))
      .parse(Bun.env);
  }

  export type Private = ReturnType<typeof initialize>;

  export type Public = Readonly<{
    [K in keyof Private as K extends `${PublicPrefix}${string}` ? K : never]: Private[K] extends z.ZodTypeAny
      ? z.infer<Private[K]>
      : Private[K];
  }>;
  export type PublicPrefix = "O_BRESPI_";
}
