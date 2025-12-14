import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type PipelineView = Pipeline & {
  lastExecution: Execution | null;
};

export namespace PipelineView {
  export const parse = ZodParser.forType<PipelineView>()
    .ensureSchemaMatchesType(
      Pipeline.parse.SCHEMA.and(
        z.object({
          lastExecution: Execution.parse.SCHEMA.nullable(),
        }),
      ),
    )
    .ensureTypeMatchesSchema();
}
