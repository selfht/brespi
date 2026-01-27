import { Generate } from "@/helpers/Generate";
import { Temporal } from "@js-temporal/polyfill";
import { Event } from "./Event";

type Subscription = {
  token: string;
  type: Event["type"];
  listener: (event: Event) => unknown;
};

export class EventBus {
  private readonly subscriptions: Subscription[] = [];

  public publish<T extends Event["type"]>(type: T, data: Extract<Event, { type: T }>["data"]) {
    const event = {
      id: Bun.randomUUIDv7(),
      object: "event",
      published: Temporal.Now.plainDateTimeISO(),
      type,
      data,
    } as Event;
    console.log(`⚡️ ${type}`);
    this.subscriptions
      .filter(({ type }) => type === event.type) //
      .forEach(({ listener }) => listener(event));
  }

  public subscribe<T extends Event["type"]>(type: T, listener: (event: Extract<Event, { type: T }>) => unknown) {
    const subscription: Subscription = {
      type,
      token: Generate.shortRandomString(),
      listener: listener as Subscription["listener"],
    };
    this.subscriptions.push(subscription);
    return subscription.token;
  }

  public unsubscribe(token: string) {
    const index = this.subscriptions.findIndex((sub) => sub.token === token);
    if (index >= 0) {
      this.subscriptions.splice(index, 1);
    }
  }
}
