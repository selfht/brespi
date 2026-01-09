import { ZodParser } from "@/helpers/ZodParser";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";

export type Manifest = {
  object: "manifest";
  items: Manifest.Item[];
};

export namespace Manifest {
  export const NAME = "__brespi_manifest__.json";

  export type Item = {
    isoTimestamp: string;
    listingPath: string;
  };
  export namespace Item {
    /**
     * Sort from most to least recent (new to old)
     */
    export function sort({ isoTimestamp: t1 }: Item, { isoTimestamp: t2 }: Item) {
      return -Temporal.PlainDateTime.compare(Temporal.PlainDateTime.from(t1), Temporal.PlainDateTime.from(t2));
    }
  }

  export function empty(): Manifest {
    return {
      object: "manifest",
      items: [],
    };
  }

  export const parse = ZodParser.forType<Manifest>()
    .ensureSchemaMatchesType(() =>
      z.object({
        object: z.literal("manifest"),
        items: z.array(
          z.object({
            isoTimestamp: z.string().refine((x) => {
              try {
                Temporal.PlainDateTime.from(x);
                return true;
              } catch {
                return false;
              }
            }, "invalid ISO timestamp"),
            listingPath: z.string(),
          }),
        ),
      }),
    )
    .ensureTypeMatchesSchema();
}
