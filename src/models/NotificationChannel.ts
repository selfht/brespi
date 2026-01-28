import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type NotificationChannel =
  | NotificationChannel.Slack //
  | NotificationChannel.CustomScript;

export namespace NotificationChannel {
  export type Slack = {
    type: "slack";
    webhookUrlReference: string;
  };
  export type CustomScript = {
    type: "custom_script";
    path: string;
  };

  export const parse = ZodParser.forType<NotificationChannel>()
    .ensureSchemaMatchesType(() =>
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("slack"),
          webhookUrlReference: z.string(),
        }),
        z.object({
          type: z.literal("custom_script"),
          path: z.string(),
        }),
      ]),
    )
    .ensureTypeMatchesSchema();
}
