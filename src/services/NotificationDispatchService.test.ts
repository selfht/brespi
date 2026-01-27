import { Event } from "@/events/Event";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Outcome } from "@/models/Outcome";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { TestFixture } from "@/testing/TestFixture.test";
import { chmod } from "fs/promises";
import { join } from "path";
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
      const outputPath = join(context.scratchpad, "output.txt");
      const scriptPath = await saveScript(`
        #!/bin/bash
        echo "BRESPI_EVENT=$BRESPI_EVENT" > ${outputPath}
        echo "BRESPI_PIPELINE_ID=$BRESPI_PIPELINE_ID" >> ${outputPath}
      `);
      const policy = createCustomScriptPolicy(scriptPath);
      const event = TestFixture.createExecutionStartedEvent();

      // when
      await service.dispatch(policy, event);

      // then
      const output = await Bun.file(outputPath).text();
      expect(output).toContain(`BRESPI_EVENT=${Event.Type.execution_started}`);
      expect(output).toContain(`BRESPI_PIPELINE_ID=${event.data.execution.pipelineId}`);
    });

    it("runs script with correct environment variables for execution_completed", async () => {
      // given
      const outputPath = join(context.scratchpad, "output.txt");
      const scriptPath = await saveScript(`
        #!/bin/bash
        echo "BRESPI_EVENT=$BRESPI_EVENT" > ${outputPath}
        echo "BRESPI_PIPELINE_ID=$BRESPI_PIPELINE_ID" >> ${outputPath}
        echo "BRESPI_OUTCOME=$BRESPI_OUTCOME" >> ${outputPath}
        echo "BRESPI_DURATION=$BRESPI_DURATION" >> ${outputPath}
      `);
      const policy = createCustomScriptPolicy(scriptPath);
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });

      // when
      await service.dispatch(policy, event);

      // then
      const output = await Bun.file(outputPath).text();
      expect(output).toContain(`BRESPI_EVENT=${Event.Type.execution_completed}`);
      expect(output).toContain(`BRESPI_PIPELINE_ID=${event.data.execution.pipelineId}`);
      expect(output).toContain(`BRESPI_OUTCOME=${Outcome.success}`);
      expect(output).toContain(`BRESPI_DURATION=${event.data.execution.result!.duration.toString()}`);
    });

    it("logs error when script execution fails", async () => {
      // given
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
      const policy = createCustomScriptPolicy("/nonexistent/path/to/script.sh");
      const event = TestFixture.createExecutionCompletedEvent({ outcome: Outcome.success });

      // when
      await service.dispatch(policy, event);

      // then
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          problem: "NotificationError::dispatch_failed",
          details: expect.objectContaining({
            channel: "custom_script",
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

  async function saveScript(content: string): Promise<string> {
    const path = join(context.scratchpad, `${Bun.randomUUIDv7()}.sh`);
    await Bun.write(path, content);
    await chmod(path, 0o755);
    return path;
  }
});
