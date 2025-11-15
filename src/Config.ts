import { Temporal } from "@js-temporal/polyfill";
import { mkdir } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";

export const Config = z
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

export namespace Config {
  export type PublicPrefix = "O_BRESPI_";

  type C = typeof Config;
  export type Public = {
    [K in keyof C as K extends `${PublicPrefix}${string}` ? K : never]: C[K] extends z.ZodTypeAny ? z.infer<C[K]> : C[K];
  };
}
