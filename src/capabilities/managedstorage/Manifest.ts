import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Version } from "./Version";

export type Manifest = {
  object: "manifest";
  items: Manifest.Item[];
};

export namespace Manifest {
  export const NAME = "__brespi_manifest__.json";

  export type Item = {
    version: string;
    totalSize: number;
    listingPath: string;
  };
  export namespace Item {
    /**
     * Sort from most to least recent (new to old)
     */
    export function sort({ version: t1 }: Item, { version: t2 }: Item) {
      return -Version.compare(t1, t2);
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
            version: z.string().refine((x) => Version.isValid(x), { error: "invalid_iso_timestamp" }),
            totalSize: z.number(),
            listingPath: z.string(),
          }),
        ),
      }),
    )
    .ensureTypeMatchesSchema();
}
