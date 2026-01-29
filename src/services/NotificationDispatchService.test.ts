import { Event } from "@/events/Event";
import { EventSubscription } from "@/models/EventSubscription";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Outcome } from "@/models/Outcome";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { TestUtils } from "@/testing/TestUtils.test";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { chmod } from "fs/promises";
import { join } from "path";
import { NotificationDispatchService } from "./NotificationDispatchService";

describe(NotificationDispatchService.name, async () => {
  let context!: TestEnvironment.Context;
  let service!: NotificationDispatchService;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    service = new NotificationDispatchService(context.yesttpMock.cast());
  });

  describe("slack", () => {
    type TestCase<E extends EventSubscription.EligibleEvent = EventSubscription.EligibleEvent> = {
      description: string;
      event: E;
      expectation: (event: E) => RegExp;
    };
    const tc = <E extends EventSubscription.EligibleEvent>(s: TestCase<E>): TestCase => {
      return s as unknown as TestCase;
    };
    const collection = TestUtils.createCollection<TestCase>("description", [
      tc({
        description: "execution_started",
        event: TestFixture.createExecutionStartedEvent(),
        expectation: (e) => new RegExp(`execution started.*${e.data.execution.pipelineId}`, "is"),
      }),
      tc({
        description: "execution_completed / success",
        event: TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success }),
        expectation: (e) => new RegExp(`succeeded.*${e.data.execution.pipelineId}.*${e.data.execution.result!.duration}`, "is"),
      }),
      tc({
        description: "execution_completed / failure",
        event: TestFixture.createExecutionCompletedEvent({ outcome: Outcome.error }),
        expectation: (e) => new RegExp(`failed.*${e.data.execution.pipelineId}.*${e.data.execution.result!.duration}`, "is"),
      }),
    ]);
    it.each(collection.testCases)("posts to slack: %s", async (testCase) => {
      const { event, expectation } = collection.get(testCase);
      // given
      context.patchEnvironmentVariables({ MY_SLACK_WEBHOOK: "https://hooks.slack.com/test" });

      // when
      const policy = slackPolicy("MY_SLACK_WEBHOOK");
      await service.dispatch(policy, event);

      // then
      expect(context.yesttpMock.post).toHaveBeenCalledTimes(1);
      expect(context.yesttpMock.post).toHaveBeenCalledWith("https://hooks.slack.com/test", {
        body: {
          text: expect.stringMatching(expectation(event)),
        },
      });
    });

    it("logs an error when the webhook env var is missing", async () => {
      // given
      const policy: NotificationPolicy = {
        id: Bun.randomUUIDv7(),
        object: "notification_policy",
        channel: { type: "slack", webhookUrlReference: "NONEXISTENT_WEBHOOK_VAR" },
        eventSubscriptions: [{ type: Event.Type.execution_completed, triggers: ["schedule"] }],
      };
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });

      // when
      const errorSpy = spyOn(console, "error").mockImplementation(() => {});
      await service.dispatch(policy, event);

      // then
      expect(context.yesttpMock.post).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          problem: "NotificationError::dispatch_failed",
        }),
      );
    });
  });

  describe("custom_script", () => {
    type TestCase<E extends EventSubscription.EligibleEvent = EventSubscription.EligibleEvent> = {
      description: string;
      event: E;
      expectationFn: (event: E) => Record<string, string>;
    };
    const tc = <E extends EventSubscription.EligibleEvent>(s: TestCase<E>): TestCase => {
      return s as unknown as TestCase;
    };

    const collection = TestUtils.createCollection<TestCase>("description", [
      tc({
        description: "execution_started",
        event: TestFixture.createExecutionStartedEvent(),
        expectationFn: (e) => ({
          BRESPI_EVENT: e.type,
          BRESPI_PIPELINE_ID: e.data.execution.pipelineId,
        }),
      }),
      tc({
        description: "execution_completed",
        event: TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success }),
        expectationFn: (e) => ({
          BRESPI_EVENT: e.type,
          BRESPI_PIPELINE_ID: e.data.execution.pipelineId,
          BRESPI_OUTCOME: e.data.execution.result!.outcome,
          BRESPI_DURATION_MS: e.data.execution.result!.duration.total("milliseconds").toString(),
        }),
      }),
    ]);
    it.each(collection.testCases)("runs a script with correct environment variables: %s", async (testCase) => {
      const { event, expectationFn } = collection.get(testCase);
      const expectation = expectationFn(event);
      // given
      const outputPath = join(context.scratchpad, "output.txt");
      const scriptPath = await saveScript(`
        #!/bin/bash
        env | grep ^BRESPI_ > ${outputPath}
      `);

      // when
      const policy = customScriptPolicy(scriptPath);
      await service.dispatch(policy, event);

      // then
      const output = await Bun.file(outputPath).text();
      const outputEnvVarAssignmentCount = (output.match(/BRESPI_/g) || []).length;
      expect(outputEnvVarAssignmentCount).toEqual(Object.entries(expectation).length);
      Object.entries(expectation).forEach(([key, value]) => {
        expect(output).toContain(`${key}=${value}`);
      });
    });

    it("logs an error when script execution fails", async () => {
      // given
      const policy = customScriptPolicy("/nonexistent/path/to/script.sh");
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });

      // when
      const errorSpy = spyOn(console, "error").mockImplementation(() => {});
      await service.dispatch(policy, event);

      // then
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          problem: "NotificationError::dispatch_failed",
          details: expect.objectContaining({
            channel: "custom_script",
          }),
        }),
      );
    });
  });

  function slackPolicy(webhookUrlReference: string): NotificationPolicy {
    return {
      id: Bun.randomUUIDv7(),
      object: "notification_policy",
      channel: { type: "slack", webhookUrlReference },
      eventSubscriptions: [{ type: Event.Type.execution_completed, triggers: ["schedule"] }],
    };
  }

  function customScriptPolicy(path: string): NotificationPolicy {
    return {
      id: Bun.randomUUIDv7(),
      object: "notification_policy",
      channel: { type: "custom_script", path },
      eventSubscriptions: [{ type: Event.Type.execution_completed, triggers: ["schedule"] }],
    };
  }

  async function saveScript(content: string): Promise<string> {
    const path = join(context.scratchpad, `${Bun.randomUUIDv7()}.sh`);
    await Bun.write(path, content);
    await chmod(path, 0o755);
    return path;
  }
});
