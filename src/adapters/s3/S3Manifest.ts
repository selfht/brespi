import z from "zod/v4";

export type S3Manifest = {
  version: 1;
  object: "manifest";
  uploads: Array<{
    name: string;
    path: string;
    timestamp: number;
  }>;
};

export namespace S3Manifest {
  export function empty(): S3Manifest {
    return {
      version: 1,
      object: "manifest",
      uploads: [],
    };
  }
  export function parse(unknown: unknown): S3Manifest {
    return z
      .object({
        version: z.literal(1),
        object: z.literal("manifest"),
        uploads: z.array(
          z.object({
            name: z.string(),
            path: z.string(),
            timestamp: z.number(),
          }),
        ),
      })
      .parse(unknown);
  }
}
