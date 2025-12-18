import { Temporal } from "@js-temporal/polyfill";
import { mkdir } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";

export namespace Env {
  export function readAndRequireValidEnvironment() {
    return z
      .object({
        O_BRESPI_STAGE: z.enum(["development", "production"]),
        X_BRESPI_ROOT: z.string(),
      })
      .transform((conf) => ({
        ...conf,
        artifactsRoot: () => join(conf.X_BRESPI_ROOT, "artifacts"),
        createTempDir: async (): Promise<string> => {
          const unixSeconds = Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);
          const folder = join(conf.X_BRESPI_ROOT, `tmp-${unixSeconds}-${Bun.randomUUIDv7()}`);
          await mkdir(folder, { recursive: true });
          return folder;
        },
      }))
      .parse(Bun.env);
  }

  export type Private = ReturnType<typeof readAndRequireValidEnvironment>;

  export type PublicPrefix = "O_BRESPI_";
  export type Public = {
    [K in keyof Private as K extends `${PublicPrefix}${string}` ? K : never]: Private[K] extends z.ZodTypeAny
      ? z.infer<Private[K]>
      : Private[K];
  };
}
