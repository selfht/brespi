import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Artifact } from "../../models/Artifact";
import { Generate } from "@/helpers/Generate";

export type Listing = {
  object: "listing";
  artifacts: Array<{
    path: string;
    size: number;
  }>;
  trail: unknown[];
  brespi: {
    commit: string;
    version: string;
  };
};

export namespace Listing {
  export const generateAvailableName = (artifacts: Array<Pick<Artifact, "name">>) => {
    const artifactNames = artifacts.map(({ name }) => name);
    const randomName = () => {
      return `__brespi_listing_${Generate.shortRandomString()}__.json`;
    };
    while (true) {
      const name = randomName();
      if (!artifactNames.includes(name)) {
        return name;
      }
    }
  };

  export const parse = ZodParser.forType<Listing>()
    .ensureSchemaMatchesType(() =>
      z.object({
        object: z.literal("listing"),
        artifacts: z.array(
          z.object({
            path: z.string(),
            size: z.number(),
          }),
        ),
        trail: z.array(z.any()),
        brespi: z.object({
          commit: z.string(),
          version: z.string(),
        }),
      }),
    )
    .ensureTypeMatchesSchema();
}
