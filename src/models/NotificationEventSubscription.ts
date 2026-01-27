import { Event } from "@/events/Event";
import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type NotificationEventSubscription =
  | {
      type: Event.Type.execution_started;
      triggers: Array<"ad_hoc" | "schedule">;
    }
  | {
      type: Event.Type.execution_completed;
      triggers: Array<"ad_hoc" | "schedule">;
    };

export namespace NotificationEventSubscription {
  export type Type = NotificationEventSubscription["type"];
  export type EligibleEvent = Extract<Event, { type: Type }>;

  export const parse = ZodParser.forType<NotificationEventSubscription>()
    .ensureSchemaMatchesType(() =>
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal(Event.Type.execution_started),
          triggers: z
            .array(z.literal(["ad_hoc", "schedule"]))
            .refine((array) => new Set(array).size === array.length, { error: "duplicate_triggers" }),
        }),
        z.object({
          type: z.literal(Event.Type.execution_completed),
          triggers: z
            .array(z.literal(["ad_hoc", "schedule"]))
            .refine((array) => new Set(array).size === array.length, { error: "duplicate_triggers" }),
        }),
      ]),
    )
    .ensureTypeMatchesSchema();
}
