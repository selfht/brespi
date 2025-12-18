import { join } from "path";
import { z } from "zod/v4";

export namespace Env {
  export function readAndValidateEnvironment() {
    return z
      .object({
        O_BRESPI_STAGE: z.enum(["development", "production"]),
        X_BRESPI_ROOT: z.string(),
      })
      .transform((conf) => ({
        ...conf,
        X_BRESPI_ARTIFACTS_ROOT: join(conf.X_BRESPI_ROOT, "artifacts"),
      }))
      .parse(Bun.env);
  }

  export type Private = ReturnType<typeof readAndValidateEnvironment>;

  export type PublicPrefix = "O_BRESPI_";
  export type Public = {
    [K in keyof Private as K extends `${PublicPrefix}${string}` ? K : never]: Private[K] extends z.ZodTypeAny
      ? z.infer<Private[K]>
      : Private[K];
  };
}
