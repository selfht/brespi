import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type NotificationChannel =
  | NotificationChannel.Slack //
  | NotificationChannel.CustomScript;

export namespace NotificationChannel {
  export type Slack = {
    name: "slack";
    webhookUrlReference: string;
  };
  export type CustomScript = {
    name: "custom_script";
    path: string;
  };

  export const parse = ZodParser.forType<NotificationChannel>()
    .ensureSchemaMatchesType(() =>
      z.discriminatedUnion("name", [
        z.object({
          name: z.literal("slack"),
          webhookUrlReference: z.string(),
        }),
        z.object({
          name: z.literal("custom_script"),
          path: z.string(),
        }),
      ]),
    )
    .ensureTypeMatchesSchema();
}
