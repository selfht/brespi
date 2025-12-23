import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Execution } from "../Execution";

export type ServerMessage = ServerMessage.ExecutionUpdate;

export namespace ServerMessage {
  export enum Type {
    execution_update = "execution_update",
  }

  export type ExecutionUpdate = {
    type: Type.execution_update;
    execution: Execution;
  };

  export const parse = ZodParser.forType<ServerMessage>()
    .ensureSchemaMatchesType(
      z.object({
        type: z.enum([Type.execution_update]),
        execution: Execution.parse.SCHEMA,
      }),
    )
    .ensureTypeMatchesSchema();
}
