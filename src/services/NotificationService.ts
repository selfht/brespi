import { ServerError } from "@/errors/ServerError";
import { Event } from "@/events/Event";
import { EventBus } from "@/events/EventBus";
import { Mutex } from "@/helpers/Mutex";
import { ZodProblem } from "@/helpers/ZodIssues";
import { NotificationChannel } from "@/models/NotificationChannel";
import { NotificationEventSubscription } from "@/models/NotificationEventSubscription";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { NotificationRepository } from "@/repositories/NotificationRepository";
import { Temporal } from "@js-temporal/polyfill";
import z from "zod/v4";
import { NotificationDispatchService } from "./NotificationDispatchService";

export class NotificationService {
  private cache: NotificationPolicy[] = [];
  private cacheUpdated?: Temporal.PlainDateTime;
  private readonly cacheMutex = new Mutex();

  public constructor(
    private readonly eventBus: EventBus,
    private readonly repository: NotificationRepository,
    private readonly dispatchService: NotificationDispatchService,
  ) {
    eventBus.subscribe("*", (event) => this.triggerNotifications(event));
  }

  public async listPolicies(): Promise<NotificationPolicy[]> {
    return this.repository.listPolicies();
  }

  public async createPolicy(unknown: z.output<typeof NotificationService.Upsert>): Promise<NotificationPolicy> {
    const policy = await this.repository.createPolicy({
      id: Bun.randomUUIDv7(),
      object: "notification_policy",
      ...NotificationService.Upsert.parse(unknown),
    });
    this.eventBus.publish(Event.Type.notification_policy_created, { policy });
    return policy;
  }

  public async updatePolicy(id: string, unknown: z.output<typeof NotificationService.Upsert>): Promise<NotificationPolicy> {
    const policy = await this.repository.updatePolicy({
      id,
      object: "notification_policy",
      ...NotificationService.Upsert.parse(unknown),
    });
    this.eventBus.publish(Event.Type.notification_policy_updated, { policy });
    return policy;
  }

  public async deletePolicy(id: string): Promise<NotificationPolicy> {
    const policy = await this.repository.deletePolicy(id);
    this.eventBus.publish(Event.Type.notification_policy_deleted, { policy });
    return policy;
  }

  private async triggerNotifications(event: Event) {
    for (const policy of await this.listPoliciesFromCache()) {
      const eventSubscriptions = policy.eventSubscriptions.filter(({ type }) => event.type === type);
      if (eventSubscriptions.length > 0 && this.declareEligible(event)) {
        for (const eventSubscription of eventSubscriptions) {
          if (this.matchesSubscriptionDetails(event, eventSubscription)) {
            this.dispatchService.dispatch(policy, event);
          }
        }
      }
    }
  }

  private async listPoliciesFromCache(): Promise<NotificationPolicy[]> {
    const checkStale = () => !this.cacheUpdated || Temporal.Now.plainDateTimeISO().since(this.cacheUpdated).total("seconds") > 1;
    if (checkStale()) {
      const { release } = await this.cacheMutex.acquire();
      try {
        if (checkStale()) {
          const policies = await this.repository.listPolicies();
          this.cache = policies;
          this.cacheUpdated = Temporal.Now.plainDateTimeISO();
        }
      } finally {
        release();
      }
    }
    return this.cache;
  }

  private declareEligible(_event: Event): _event is NotificationEventSubscription.EligibleEvent {
    return true;
  }

  private matchesSubscriptionDetails(
    event: NotificationEventSubscription.EligibleEvent,
    eventSubscription: NotificationEventSubscription,
  ): boolean {
    switch (event.type) {
      case Event.Type.execution_started: {
        return eventSubscription.triggers.includes(event.data.trigger);
      }
      case Event.Type.execution_completed: {
        return eventSubscription.triggers.includes(event.data.trigger);
      }
    }
  }
}

export namespace NotificationService {
  const a = {
    id: Bun.randomUUIDv7(),
    channel: {
      name: "slack",
      webhookUrlReference: "MY_SLACK_WEBHOOK",
    },
    eventSubscriptions: [
      {
        type: Event.Type.execution_completed,
        triggers: ["schedule"],
      },
    ],
  };
  export const Upsert = z
    .object({
      channel: NotificationChannel.parse.SCHEMA,
      eventSubscriptions: z.array(NotificationEventSubscription.parse.SCHEMA),
    })
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
