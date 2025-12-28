import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Artifact } from "../Artifact";

export type ArtifactIndex = {
  object: "artifact_index";
  artifacts: Array<{
    path: string;
    stepTrail: unknown[];
  }>;
};

export namespace ArtifactIndex {
  export const generateName = (artifacts: Array<Pick<Artifact, "name">>) => {
    const artifactNames = artifacts.map(({ name }) => name);
    const result = (extraUnderscores: number) => {
      const underscores = "_".repeat(2 + extraUnderscores);
      return `${underscores}brespi_artifact_index${underscores}.json`;
    };
    for (let extraUnderscores = 0; true; extraUnderscores++) {
      const name = result(extraUnderscores);
      if (!artifactNames.includes(name)) {
        return name;
      }
    }
  };

  export const parse = ZodParser.forType<ArtifactIndex>()
    .ensureSchemaMatchesType(() =>
      z.object({
        object: z.literal("artifact_index"),
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
