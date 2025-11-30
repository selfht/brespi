import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type PipelineView = Pipeline & {
  executions: Execution[];
};

export namespace PipelineView {
  export const parse = ZodParser.forType<PipelineView>()
    .ensureSchemaMatchesType(
      Pipeline.parse.SCHEMA.and(
        z.object({
          executions: z.array(Execution.parse.SCHEMA),
        }),
      ),
    )
    .ensureTypeMatchesSchema();
}
