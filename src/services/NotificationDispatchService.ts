import { NotificationError } from "@/errors/NotificationError";
import { Event } from "@/events/Event";
import { assertNever } from "@/helpers/assertNever";
import { CommandRunner } from "@/helpers/CommandRunner";
import { EventSubscription } from "@/models/EventSubscription";
import { NotificationChannel } from "@/models/NotificationChannel";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Outcome } from "@/models/Outcome";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { Temporal } from "@js-temporal/polyfill";
import { basename, dirname } from "path";
import { Yesttp } from "yesttp";

type EventDetails =
  | {
      event: Event.Type.execution_started;
      pipelineId: string;
      pipelineName: string;
    }
  | {
      event: Event.Type.execution_completed;
      pipelineId: string;
      pipelineName: string;
      outcome: "success" | "error";
      duration: Temporal.Duration;
    };

export class NotificationDispatchService {
  public constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly yesttp = new Yesttp(),
  ) {}

  public async dispatch(policy: NotificationPolicy, event: EventSubscription.EligibleEvent) {
    try {
      switch (policy.channel.type) {
        case "slack": {
          await this.dispatchToSlack(policy.channel, await this.details(event));
          break;
        }
        case "custom_script": {
          await this.dispatchToCustomScript(policy.channel, await this.details(event));
          break;
        }
        default: {
          assertNever(policy.channel);
        }
      }
    } catch (e) {
      const error = NotificationError.dispatch_failed({
        channel: policy.channel.type,
        eventType: event.type,
        cause: e instanceof Error ? e.message : String(e),
      });
      console.error(error.json());
    }
  }

  private async details(event: EventSubscription.EligibleEvent): Promise<EventDetails> {
    const getPipelineName = async (pipelineId: string) => {
      const pipeline = await this.pipelineRepository.findById(pipelineId);
      return pipeline?.name ?? "";
    };
    switch (event.type) {
      case Event.Type.execution_started: {
        const { pipelineId } = event.data.execution;
        return {
          event: event.type,
          pipelineId,
          pipelineName: await getPipelineName(pipelineId),
        };
      }
      case Event.Type.execution_completed: {
        const { pipelineId, result } = event.data.execution;
        const { outcome, duration } = result!;
        return {
          event: event.type,
          pipelineId,
          pipelineName: await getPipelineName(pipelineId),
          outcome,
          duration,
        };
      }
    }
  }

  private async dispatchToSlack(channel: NotificationChannel.Slack, details: EventDetails) {
    const webhookUrl = Bun.env[channel.webhookUrlReference];
    if (!webhookUrl) {
      throw new Error(`Slack webhook URL not found in environment variable: ${channel.webhookUrlReference}`);
    }
    let text: string;
    switch (details.event) {
      case Event.Type.execution_started: {
        text = `⏳ Execution started
          \`\`\`
          pipeline: ${details.pipelineName}
          pipelineId: ${details.pipelineId}
          \`\`\`
       `;
        break;
      }
      case Event.Type.execution_completed: {
        const success = details.outcome === "success";
        text = `${success ? "✅" : "❌"} Execution ${success ? "succeeded" : "failed"}
          \`\`\`
          pipeline: ${details.pipelineName}
          pipelineId: ${details.pipelineId}
          durationMs: ${details.duration.total("milliseconds")}
          \`\`\`
        `;
        break;
      }
    }
    await this.yesttp.post(webhookUrl, { body: { text } });
  }

  private async dispatchToCustomScript(channel: NotificationChannel.CustomScript, details: EventDetails) {
    const envVars: Record<string, string> = {
      BRESPI_EVENT: details.event,
    };
    switch (details.event) {
      case Event.Type.execution_started: {
        Object.assign(envVars, {
          BRESPI_PIPELINE_ID: details.pipelineId,
          BRESPI_PIPELINE_NAME: details.pipelineName,
        });
        break;
      }
      case Event.Type.execution_completed: {
        Object.assign(envVars, {
          BRESPI_PIPELINE_ID: details.pipelineId,
          BRESPI_PIPELINE_NAME: details.pipelineName,
          BRESPI_OUTCOME: details.outcome,
          BRESPI_DURATION_MS: details.duration.total("milliseconds").toString(),
        });
        break;
      }
      default: {
        assertNever(details);
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
