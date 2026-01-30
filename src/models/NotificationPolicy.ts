import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";
import { NotificationChannel } from "./NotificationChannel";
import { EventSubscription } from "./EventSubscription";

export type NotificationPolicy = NotificationPolicy.Core & {
  active: boolean;
};

export namespace NotificationPolicy {
  export type Core = {
    id: string;
    object: "notification_policy";
    channel: NotificationChannel;
    eventSubscriptions: EventSubscription[];
  };

  export type Metadata = {
    id: string;
    object: "notification_policy.metadata";
    active: boolean;
  };

  export namespace Metadata {
    export function standard(id: string): Metadata {
      return {
        id,
        object: "notification_policy.metadata",
        active: true,
      };
    }
  }

  export const parse = ZodParser.forType<NotificationPolicy>()
    .ensureSchemaMatchesType(() =>
      z
        .object({
          id: z.string(),
          object: z.literal("notification_policy"),
          channel: NotificationChannel.parse.SCHEMA,
          eventSubscriptions: z.array(EventSubscription.parse.SCHEMA),
          active: z.boolean(),
        })
        .refine(
          ({ eventSubscriptions }) => {
            const counts = new Map<EventSubscription.Type, number>();
            for (const { type } of eventSubscriptions) {
              counts.set(type, (counts.get(type) ?? 0) + 1);
            }
            return counts.values().every((occurrences) => occurrences <= 1);
          },
          { error: "multiple_subscriptions_per_event_type" },
        ),
    )
    .ensureTypeMatchesSchema();
}
