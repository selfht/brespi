import { NotificationError } from "@/errors/NotificationError";
import { Event } from "@/events/Event";
import { assertNever } from "@/helpers/assertNever";
import { CommandRunner } from "@/helpers/CommandRunner";
import { NotificationChannel } from "@/models/NotificationChannel";
import { NotificationEventSubscription } from "@/models/NotificationEventSubscription";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Outcome } from "@/models/Outcome";
import { basename, dirname } from "path";
import { Yesttp } from "yesttp";

type EligibleEvent = Extract<Event, { type: NotificationEventSubscription.Type }>;

export class NotificationDispatchService {
  public constructor(private readonly yesttp = new Yesttp()) {}

  public async dispatch(policy: NotificationPolicy, event: EligibleEvent) {
    try {
      switch (policy.channel.name) {
        case "slack": {
          await this.dispatchToSlack(policy.channel, event);
          break;
        }
        case "custom_script": {
          await this.dispatchToCustomScript(policy.channel, event);
          break;
        }
        default: {
          assertNever(policy.channel);
        }
      }
    } catch (e) {
      const error = NotificationError.dispatch_failed({
        channel: policy.channel.name,
        eventType: event.type,
        cause: e instanceof Error ? e.message : String(e),
      });
      console.error(error.json());
    }
  }

  private async dispatchToSlack(channel: NotificationChannel.Slack, event: EligibleEvent) {
    const webhookUrl = Bun.env[channel.webhookUrlReference];
    if (!webhookUrl) {
      throw new Error(`Slack webhook URL not found in environment variable: ${channel.webhookUrlReference}`);
    }
    let text: string;
    switch (event.type) {
      case Event.Type.execution_started: {
        text = `Execution started
          \`\`\`
          pipeline: ${event.data.execution.pipelineId}
          \`\`\`
       `;
        break;
      }
      case Event.Type.execution_completed: {
        const result = event.data.execution.result!;
        text = `Execution ${result.outcome === Outcome.success ? "succeeded" : "failed"}
          \`\`\`
          pipeline: ${event.data.execution.pipelineId}
          duration: ${result.duration}
          \`\`\`
        `;
        break;
      }
    }
    await this.yesttp.post(webhookUrl, { body: { text } });
  }

  private async dispatchToCustomScript(channel: NotificationChannel.CustomScript, event: EligibleEvent) {
    const envVars: Record<string, string> = {
      BRESPI_EVENT: event.type,
    };
    switch (event.type) {
      case Event.Type.execution_started: {
        envVars.BRESPI_PIPELINE_ID = event.data.execution.pipelineId;
        break;
      }
      case Event.Type.execution_completed: {
        const result = event.data.execution.result!;
        envVars.BRESPI_PIPELINE_ID = event.data.execution.pipelineId;
        envVars.BRESPI_OUTCOME = result.outcome;
        envVars.BRESPI_DURATION = result.duration.toString(); // TODO: check
        break;
      }
      default: {
        assertNever(event);
      }
    }
    await CommandRunner.run({
      cmd: ["bash", "-c", `./${basename(channel.path)}`],
      cwd: dirname(channel.path),
      env: {
        ...Bun.env,
        ...envVars,
      },
    });
  }
}
