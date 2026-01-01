import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { Configuration } from "../Configuration";
import { Execution } from "../Execution";

export type ServerMessage =
  | ServerMessage.ExecutionUpdate //
  | ServerMessage.ConfigurationUpdate;

export namespace ServerMessage {
  export enum Type {
    execution_update = "execution_update",
    configuration_update = "configuration_update",
  }

  export type ExecutionUpdate = {
    type: Type.execution_update;
    execution: Execution;
  };

  export type ConfigurationUpdate = {
    type: Type.configuration_update;
    configuration: Configuration;
  };

  export const parse = ZodParser.forType<ServerMessage>()
    .ensureSchemaMatchesType(() => {
      return z.union([
        z.object({
          type: z.literal(Type.execution_update),
          execution: Execution.parse.SCHEMA,
        }),
        z.object({
          type: z.literal(Type.configuration_update),
          configuration: Configuration.parse.SCHEMA,
        }),
      ]);
    })
    .ensureTypeMatchesSchema();
}
