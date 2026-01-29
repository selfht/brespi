import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { NotificationChannel } from "./NotificationChannel";
import { EventSubscription } from "./EventSubscription";

export type NotificationPolicy = {
  id: string;
  object: "notification_policy";
  channel: NotificationChannel;
  eventSubscriptions: EventSubscription[];
};

export namespace NotificationPolicy {
  export const parse = ZodParser.forType<NotificationPolicy>()
    .ensureSchemaMatchesType(() =>
      z.object({
        id: z.string(),
        object: z.literal("notification_policy"),
        channel: NotificationChannel.parse.SCHEMA,
        eventSubscriptions: z.array(EventSubscription.parse.SCHEMA),
      }),
    )
    .ensureTypeMatchesSchema();
}
