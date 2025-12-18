import { Temporal } from "@js-temporal/polyfill";
import { mkdir } from "fs/promises";
import { join } from "path";
import { z } from "zod/v4";

let __value__: ReturnType<typeof parseEnv> | undefined = undefined;

export function Env() {
  if (!__value__) {
    __value__ = parseEnv();
  }
  return __value__;
}
function parseEnv() {
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

export namespace Env {
  export type PublicPrefix = "O_BRESPI_";

  type E = ReturnType<typeof parseEnv>;
  export type Private = E;
  export type Public = {
    [K in keyof E as K extends `${PublicPrefix}${string}` ? K : never]: E[K] extends z.ZodTypeAny ? z.infer<E[K]> : E[K];
  };
}
