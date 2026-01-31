import { Temporal } from "@js-temporal/polyfill";
import { isAbsolute, join } from "path";
import { z } from "zod/v4";

export namespace Env {
  const baseEnv = z.object({
    X_BRESPI_ROOT: z.string(),
    O_BRESPI_STAGE: z.enum(["development", "production"]),
    O_BRESPI_COMMIT: z.string().default("0000000000000000000000000000000000000000"),
    O_BRESPI_VERSION: z.string().default("0.0.0"),
    X_BRESPI_ENABLE_RESTRICTED_ENTPOINTS: z.enum(["true", "false"]).default("false"),
  });
  export function initialize(environment = Bun.env as z.output<typeof baseEnv>) {
    return baseEnv
      .transform((env) => ({
        ...env,
        X_BRESPI_ROOT: isAbsolute(env.X_BRESPI_ROOT) ? env.X_BRESPI_ROOT : join(process.cwd(), env.X_BRESPI_ROOT),
      }))
      .transform((env) => {
        const data = "data";
        return {
          ...env,
          O_BRESPI_CONFIGURATION: join(env.X_BRESPI_ROOT, "config.json"),
          X_BRESPI_HTPASSWD: join(env.X_BRESPI_ROOT, ".htpasswd"),
          X_BRESPI_TMP_ROOT: join(env.X_BRESPI_ROOT, "tmp"),
          X_BRESPI_DATA_ROOT: join(env.X_BRESPI_ROOT, data),
          X_BRESPI_DATABASE: join(env.X_BRESPI_ROOT, data, "db.sqlite"),
          X_BRESPI_ARTIFICIAL_STEP_EXECUTION_DELAY: Temporal.Duration.from(
            env.O_BRESPI_STAGE === "development" ? { seconds: 0 } : { seconds: 0 }, //
          ),
          X_BRESPI_TMP_ITEMS_RETENTION_PERIOD: Temporal.Duration.from(
            env.O_BRESPI_STAGE === "development" ? { minutes: 5 } : { days: 3 }, //
          ),
          X_BRESPI_ENABLE_RESTRICTED_ENTPOINTS: env.X_BRESPI_ENABLE_RESTRICTED_ENTPOINTS === "true",
        };
      })
      .parse(environment);
  }

  export type Private = ReturnType<typeof initialize>;

  export type Public = Readonly<{
    [K in keyof Private as K extends `${PublicPrefix}${string}` ? K : never]: Private[K] extends z.ZodTypeAny
      ? z.output<Private[K]>
      : Private[K];
  }>;
  export type PublicPrefix = "O_BRESPI_";
}
