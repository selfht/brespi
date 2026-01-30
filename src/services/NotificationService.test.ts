import { Event } from "@/events/Event";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { TestUtils } from "@/testing/TestUtils.test";
import { OmitBetter } from "@/types/OmitBetter";
import { beforeEach, describe, expect, it } from "bun:test";
import { NotificationService } from "./NotificationService";

describe(NotificationService.name, async () => {
  let context!: TestEnvironment.Context;
  let service!: NotificationService; // unused, because we communicate via the event bus

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    service = new NotificationService(context.eventBus, context.notificationRepository, context.notificationDispatchServiceMock.cast());
  });

  it("dispatches a notification when event type and trigger match", async () => {
    // given
    const policy = await createPolicy({
      channel: { type: "slack", webhookUrlReference: "SLACK_WEBHOOK" },
      eventSubscriptions: [
        {
          type: Event.Type.execution_completed,
          triggers: ["schedule"],
        },
      ],
    });

    // when
    context.eventBus.publish(Event.Type.execution_completed, {
      trigger: "schedule",
      execution: TestFixture.createExecution(),
    });

    // then
    await TestUtils.waitUntil(
      () => context.notificationDispatchServiceMock.dispatch.mock.calls.length,
      (count) => count >= 1,
    );
    expect(context.notificationDispatchServiceMock.dispatch).toHaveBeenCalledWith(
      policy,
      expect.objectContaining({ type: Event.Type.execution_completed }),
    );
  });

  it("does not dispatch when event type matches but trigger does not", async () => {
    // given
    await createPolicy({
      channel: { type: "slack", webhookUrlReference: "SLACK_WEBHOOK" },
      eventSubscriptions: [
        {
          type: Event.Type.execution_completed,
          triggers: ["schedule"],
        },
      ],
    });

    // when
    context.eventBus.publish(Event.Type.execution_completed, {
      trigger: "ad_hoc",
      execution: TestFixture.createExecution(),
    });
    await TestUtils.sleep(100);

    // then
    expect(context.notificationDispatchServiceMock.dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when event type does not match", async () => {
    // given
    await createPolicy({
      channel: { type: "slack", webhookUrlReference: "SLACK_WEBHOOK" },
      eventSubscriptions: [
        {
          type: Event.Type.execution_started,
          triggers: ["schedule", "ad_hoc"],
        },
      ],
    });

    // when
    context.eventBus.publish(Event.Type.execution_completed, {
      trigger: "schedule",
      execution: TestFixture.createExecution(),
    });
    await TestUtils.sleep(100);

    // then
    expect(context.notificationDispatchServiceMock.dispatch).not.toHaveBeenCalled();
  });

  it("dispatches to multiple policies when both match", async () => {
    // given
    const policy1 = await createPolicy({
      channel: { type: "slack", webhookUrlReference: "SLACK_WEBHOOK" },
      eventSubscriptions: [
        {
          type: Event.Type.execution_completed,
          triggers: ["schedule"],
        },
      ],
    });
    const policy2 = await createPolicy({
      channel: { type: "custom_script", path: "/scripts/notify.sh" },
      eventSubscriptions: [
        {
          type: Event.Type.execution_completed,
          triggers: ["schedule"],
        },
      ],
    });

    // when
    context.eventBus.publish(Event.Type.execution_completed, {
      trigger: "schedule",
      execution: TestFixture.createExecution(),
    });

    // then
    await TestUtils.waitUntil(
      () => context.notificationDispatchServiceMock.dispatch.mock.calls.length,
      (count) => count >= 2,
    );
    expect(context.notificationDispatchServiceMock.dispatch).toHaveBeenCalledWith(
      policy1,
      expect.objectContaining({
        type: Event.Type.execution_completed,
      }),
    );
    expect(context.notificationDispatchServiceMock.dispatch).toHaveBeenCalledWith(
      policy2,
      expect.objectContaining({
        type: Event.Type.execution_completed,
      }),
    );
  });

  it("dispatches when a policy has multiple triggers and one matches", async () => {
    // given
    await createPolicy({
      channel: { type: "slack", webhookUrlReference: "SLACK_WEBHOOK" },
      eventSubscriptions: [
        {
          type: Event.Type.execution_completed,
          triggers: ["schedule", "ad_hoc"],
        },
      ],
    });

    // when
    context.eventBus.publish(Event.Type.execution_completed, {
      trigger: "ad_hoc",
      execution: TestFixture.createExecution(),
    });

    // then
    await TestUtils.waitUntil(
      () => context.notificationDispatchServiceMock.dispatch.mock.calls.length,
      (count) => count >= 1,
    );
  });

  async function createPolicy(policy: OmitBetter<NotificationPolicy, "id" | "object" | "active">): Promise<NotificationPolicy> {
    return context.notificationRepository.createPolicy({
      id: Bun.randomUUIDv7(),
      object: "notification_policy",
      active: true,
      ...policy,
    });
  }
});
