import { Event } from "@/events/Event";
import { CommandRunner } from "@/helpers/CommandRunner";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Outcome } from "@/models/Outcome";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { NotificationDispatchService } from "./NotificationDispatchService";

describe(NotificationDispatchService.name, async () => {
  let context!: TestEnvironment.Context;
  let service!: NotificationDispatchService;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    service = new NotificationDispatchService(context.yesttpMock.cast());
  });

  describe("slack", () => {
    it("posts to slack webhook with an execution_started message", async () => {
      // given
      context.patchEnvironmentVariables({ MY_SLACK_WEBHOOK: "https://hooks.slack.com/test" });
      const policy = createSlackPolicy("MY_SLACK_WEBHOOK");
      const event = TestFixture.createExecutionStartedEvent();

      // when
      await service.dispatch(policy, event);

      // then
      expect(context.yesttpMock.post).toHaveBeenCalledTimes(1);
      expect(context.yesttpMock.post).toHaveBeenCalledWith("https://hooks.slack.com/test", {
        body: {
          text: expect.stringMatching(new RegExp(`Execution started.+${event.data.execution.pipelineId}`, "s")),
        },
      });
    });

    it("posts to slack webhook with an execution_completed success message", async () => {
      // given
      context.patchEnvironmentVariables({ MY_SLACK_WEBHOOK: "https://hooks.slack.com/test" });
      const policy = createSlackPolicy("MY_SLACK_WEBHOOK");
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });

      // when
      await service.dispatch(policy, event);

      // then
      expect(context.yesttpMock.post).toHaveBeenCalledTimes(1);
      expect(context.yesttpMock.post).toHaveBeenCalledWith("https://hooks.slack.com/test", {
        body: {
          text: expect.stringContaining("succeeded"),
        },
      });
    });

    it("posts to slack webhook with execution_completed failure message", async () => {
      // given
      context.patchEnvironmentVariables({ MY_SLACK_WEBHOOK: "https://hooks.slack.com/test" });
      const policy = createSlackPolicy("MY_SLACK_WEBHOOK");
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.error });

      // when
      await service.dispatch(policy, event);

      // then
      expect(context.yesttpMock.post).toHaveBeenCalledTimes(1);
      expect(context.yesttpMock.post).toHaveBeenCalledWith("https://hooks.slack.com/test", {
        body: {
          text: expect.stringContaining("failed"),
        },
      });
    });

    it("logs an error when webhook env var is missing", async () => {
      // given
      const policy: NotificationPolicy = {
        id: Bun.randomUUIDv7(),
        channel: { name: "slack", webhookUrlReference: "NONEXISTENT_WEBHOOK_VAR" },
        eventSubscriptions: [{ type: Event.Type.execution_completed, triggers: ["schedule"] }],
      };
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      // when
      await service.dispatch(policy, event);

      // then
      expect(context.yesttpMock.post).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          problem: "NotificationError::dispatch_failed",
        }),
      );
    });
  });

  describe("custom_script", () => {
    it("runs script with correct environment variables for execution_started", async () => {
      // given
      const commandRunnerSpy = spyOn(CommandRunner, "run").mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
        stdall: "",
      });
      const policy = createCustomScriptPolicy("/opt/scripts/notify.sh");
      const event = TestFixture.createExecutionStartedEvent();

      // when
      await service.dispatch(policy, event);

      // then
      expect(commandRunnerSpy).toHaveBeenCalledTimes(1);
      expect(commandRunnerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cmd: ["bash", "-c", "./notify.sh"],
          cwd: "/opt/scripts",
          env: expect.objectContaining({
            BRESPI_EVENT_TYPE: Event.Type.execution_started,
            BRESPI_PIPELINE_ID: event.data.execution.pipelineId,
          }),
        }),
      );
    });

    it("runs script with correct environment variables for execution_completed", async () => {
      // given
      const commandRunnerSpy = spyOn(CommandRunner, "run").mockResolvedValue({
        exitCode: 0,
        stdout: "",
        stderr: "",
        stdall: "",
      });
      const policy = createCustomScriptPolicy("/opt/scripts/notify.sh");
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });

      // when
      await service.dispatch(policy, event);

      // then
      expect(commandRunnerSpy).toHaveBeenCalledTimes(1);
      expect(commandRunnerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          env: expect.objectContaining({
            BRESPI_EVENT_TYPE: Event.Type.execution_completed,
            BRESPI_PIPELINE_ID: event.data.execution.pipelineId,
            BRESPI_OUTCOME: Outcome.success,
            BRESPI_DURATION: event.data.execution.result!.duration.toString(),
          }),
        }),
      );
    });

    it("logs error when script execution fails", async () => {
      // given
      spyOn(CommandRunner, "run").mockRejectedValue(new Error("Script failed"));
      const consoleError = spyOn(console, "error").mockImplementation(() => {});
      const policy = createCustomScriptPolicy("/opt/scripts/notify.sh");
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });

      // when
      await service.dispatch(policy, event);

      // then
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({
          problem: "NotificationError::dispatch_failed",
          details: expect.objectContaining({
            channel: "custom_script",
            cause: "Script failed",
          }),
        }),
      );
    });
  });

  function createSlackPolicy(webhookUrlReference: string): NotificationPolicy {
    return {
      id: Bun.randomUUIDv7(),
      channel: { name: "slack", webhookUrlReference },
      eventSubscriptions: [{ type: Event.Type.execution_completed, triggers: ["schedule"] }],
    };
  }

  function createCustomScriptPolicy(path: string): NotificationPolicy {
    return {
      id: Bun.randomUUIDv7(),
      channel: { name: "custom_script", path },
      eventSubscriptions: [{ type: Event.Type.execution_completed, triggers: ["schedule"] }],
    };
  }
});
