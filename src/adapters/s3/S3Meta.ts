import { PipelineStep } from "@/models/PipelineStep";
import z from "zod/v4";

export type S3Meta = {
  version: 1;
  object: "meta";
  name: string;
  timestamp: number;
  trail: PipelineStep[] | unknown[];
};

export namespace S3Meta {
  export function parse(unknown: unknown): S3Meta {
    return z
      .object({
        version: z.literal(1),
        object: z.literal("meta"),
        name: z.string(),
        timestamp: z.number(),
        trail: z.array(z.any()),
      })
      .parse(unknown);
  }
}
