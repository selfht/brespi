import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Artifact } from "../Artifact";
import { Generate } from "@/helpers/Generate";

export type ArtifactIndex = {
  object: "artifact_index";
  artifacts: Array<{
    path: string;
    trail: unknown[];
  }>;
};

export namespace ArtifactIndex {
  export const generateName = (artifacts: Array<Pick<Artifact, "name">>) => {
    const artifactNames = artifacts.map(({ name }) => name);
    const randomName = () => {
      return `__brespi_artifact_index_${Generate.shortRandomString()}__.json`;
    };
    while (true) {
      const name = randomName();
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
            trail: z.array(z.any()),
          }),
        ),
      }),
    )
    .ensureTypeMatchesSchema();
}
