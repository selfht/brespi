import { Configuration } from "@/models/Configuration";
import { ServerError } from "@/errors/ServerError";
import { Event } from "@/events/Event";
import { EventBus } from "@/events/EventBus";
import { Mutex } from "@/helpers/Mutex";
import { ZodProblem } from "@/helpers/ZodIssues";
import { NotificationChannel } from "@/models/NotificationChannel";
import { EventSubscription } from "@/models/EventSubscription";
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
    eventBus.subscribe(Event.Type.configuration_updated, ({ data: { configuration, trigger } }) => {
      if (trigger === "disk_synchronization") {
        this.synchronizeWithUpdatedConfiguration(configuration);
      }
    });
  }

  private async synchronizeWithUpdatedConfiguration({ notificationPolicies }: Configuration) {
    await this.repository.synchronizeWithUpdatedConfiguration(notificationPolicies);
  }

  public async listPolicies(): Promise<NotificationPolicy[]> {
    return this.repository.listPolicies();
  }

  public async createPolicy(unknown: z.output<typeof NotificationService.Upsert>): Promise<NotificationPolicy> {
    const { active, channel, eventSubscriptions } = NotificationService.Upsert.parse(unknown);
    const policy = await this.repository.createPolicy({
      id: Bun.randomUUIDv7(),
      object: "notification_policy",
      active,
      channel,
      eventSubscriptions,
    });
    this.eventBus.publish(Event.Type.notification_policy_created, { policy });
    return policy;
  }

  public async updatePolicy(id: string, unknown: z.output<typeof NotificationService.Upsert>): Promise<NotificationPolicy> {
    const { active, channel, eventSubscriptions } = NotificationService.Upsert.parse(unknown);
    const policy = await this.repository.updatePolicy({
      id,
      object: "notification_policy",
      active,
      channel,
      eventSubscriptions,
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
      if (!policy.active) continue;
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

  private declareEligible(_event: Event): _event is EventSubscription.EligibleEvent {
    return true;
  }

  private matchesSubscriptionDetails(event: EventSubscription.EligibleEvent, eventSubscription: EventSubscription): boolean {
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
  export const Upsert = z
    .object({
      active: z.boolean(),
      channel: NotificationChannel.parse.SCHEMA,
      eventSubscriptions: z.array(EventSubscription.parse.SCHEMA),
    })
    .transform((value) => ({
      ...value,
      eventSubscriptions: value.eventSubscriptions.filter((sub) => {
        switch (sub.type) {
          case Event.Type.execution_started:
            return sub.triggers.length > 0;
          case Event.Type.execution_completed:
            return sub.triggers.length > 0;
        }
      }),
    }))
    .catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    });
}
