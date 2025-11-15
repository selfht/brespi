import { z } from "zod/v4";

export const Config = z
  .object({
    O_BACNREESE_STAGE: z.enum(["development", "production"]),
  })
  .parse(Bun.env);

export namespace Config {
  export type PublicPrefix = "O_BACNREESE_";

  type C = typeof Config;
  export type Public = {
    [K in keyof C as K extends `${PublicPrefix}${string}` ? K : never]: C[K] extends z.ZodTypeAny ? z.infer<C[K]> : C[K];
  };
}
