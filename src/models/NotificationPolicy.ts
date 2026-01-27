import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { NotificationChannel } from "./NotificationChannel";
import { NotificationEventSubscription } from "./NotificationEventSubscription";

export type NotificationPolicy = {
  id: string;
  object: "notification_policy";
  channel: NotificationChannel;
  eventSubscriptions: NotificationEventSubscription[];
};

export namespace NotificationPolicy {
  export const parse = ZodParser.forType<NotificationPolicy>()
    .ensureSchemaMatchesType(() =>
      z.object({
        id: z.string(),
        object: z.literal("notification_policy"),
        channel: NotificationChannel.parse.SCHEMA,
        eventSubscriptions: z.array(NotificationEventSubscription.parse.SCHEMA),
      }),
    )
    .ensureTypeMatchesSchema();
}
