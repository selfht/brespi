import { Event } from "@/events/Event";
import { ZodParser } from "@/helpers/ZodParser";
import z from "zod/v4";

export type EventSubscription =
  | {
      type: Event.Type.execution_started;
      triggers: Array<"ad_hoc" | "schedule">;
      something_else_lol: number;
    }
  | {
      type: Event.Type.execution_completed;
      triggers: Array<"ad_hoc" | "schedule">;
    };

export namespace EventSubscription {
  export type Type = EventSubscription["type"];
  export type EligibleEvent = Extract<Event, { type: Type }>;

  export const parse = ZodParser.forType<EventSubscription>()
    .ensureSchemaMatchesType(() =>
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal(Event.Type.execution_started),
          triggers: z
            .array(z.literal(["ad_hoc", "schedule"]))
            .refine((array) => new Set(array).size === array.length, { error: "duplicate_triggers" }),
          something_else_lol: z.number(),
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
