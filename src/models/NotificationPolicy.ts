import { ZodParser } from "@/helpers/ZodParser";
import { NotificationChannel } from "./NotificationChannel";
import { NotificationEventSubscription } from "./NotificationEventSubscription";
import z from "zod/v4";

export type NotificationPolicy = {
  id: string;
  channel: NotificationChannel;
  eventSubscriptions: NotificationEventSubscription[];
};

export namespace NotificationPolicy {
  export const parse = ZodParser.forType<NotificationPolicy>()
    .ensureSchemaMatchesType(() =>
      z.object({
        id: z.string(),
        channel: NotificationChannel.parse.SCHEMA,
        eventSubscriptions: z.array(NotificationEventSubscription.parse.SCHEMA),
      }),
    )
    .ensureTypeMatchesSchema();
}
