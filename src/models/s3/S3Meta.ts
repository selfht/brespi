import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type S3Meta = {
  version: 1;
  object: "meta";
  artifacts: Array<{
    path: string;
    stepTrail: unknown[];
  }>;
};

export namespace S3Meta {
  export const parse = ZodParser.forType<S3Meta>()
    .ensureSchemaMatchesType(
      z.object({
        version: z.literal(1),
        object: z.literal("meta"),
        artifacts: z.array(
          z.object({
            path: z.string(),
            stepTrail: z.array(z.any()),
          }),
        ),
      }),
    )
    .ensureTypeMatchesSchema();
}
