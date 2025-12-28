import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";

export type S3Manifest = {
  version: 1;
  object: "manifest";
  uploads: S3Manifest.Upload[];
};

export namespace S3Manifest {
  export type Upload = {
    isoTimestamp: string;
    path: string;
  };
  export namespace Upload {
    /**
     * Sort from most to least recent (new to old)
     */
    export function sort({ isoTimestamp: t1 }: Upload, { isoTimestamp: t2 }: Upload) {
      return -Temporal.PlainDateTime.compare(Temporal.PlainDateTime.from(t1), Temporal.PlainDateTime.from(t2));
    }
  }

  export function empty(): S3Manifest {
    return {
      version: 1,
      object: "manifest",
      uploads: [],
    };
  }

  export const parse = ZodParser.forType<S3Manifest>()
    .ensureSchemaMatchesType(() =>
      z.object({
        version: z.literal(1),
        object: z.literal("manifest"),
        uploads: z.array(
          z.object({
            isoTimestamp: z.string().refine((x) => {
              try {
                Temporal.PlainDateTime.from(x);
                return true;
              } catch {
                return false;
              }
            }, "invalid ISO timestamp"),
            path: z.string(),
          }),
        ),
      }),
    )
    .ensureTypeMatchesSchema();
}
