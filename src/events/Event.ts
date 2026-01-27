import { Configuration } from "@/models/Configuration";
import { Execution } from "@/models/Execution";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { Temporal } from "node_modules/@js-temporal/polyfill/index.cjs";

export type Event =
  // configuration
  | Instance<Event.Type.configuration_updated, { configuration: Configuration; trigger: "application" | "disk_synchronization" }>
  // pipelines
  | Instance<Event.Type.pipeline_created, { pipeline: Pipeline }>
  | Instance<Event.Type.pipeline_updated, { pipeline: Pipeline }>
  | Instance<Event.Type.pipeline_deleted, { pipeline: Pipeline }>
  // schedules
  | Instance<Event.Type.schedule_created, { schedule: Schedule }>
  | Instance<Event.Type.schedule_updated, { schedule: Schedule }>
  | Instance<Event.Type.schedule_deleted, { schedule: Schedule }>
  // executions
  | Instance<Event.Type.execution_started, { execution: Execution; trigger: "ad_hoc" | "schedule" }>
  | Instance<Event.Type.execution_completed, { execution: Execution; trigger: "ad_hoc" | "schedule" }>
  // notification policies
  | Instance<Event.Type.notification_policy_created, { policy: NotificationPolicy }>
  | Instance<Event.Type.notification_policy_updated, { policy: NotificationPolicy }>
  | Instance<Event.Type.notification_policy_deleted, { policy: NotificationPolicy }>;

type Instance<T extends Event.Type, D> = {
  id: string;
  object: "event";
  published: Temporal.PlainDateTime;
  type: T;
  data: D;
};

export namespace Event {
  export enum Type {
    configuration_updated = "configuration_updated",
    pipeline_created = "pipeline_created",
    pipeline_updated = "pipeline_updated",
    pipeline_deleted = "pipeline_deleted",
    schedule_created = "schedule_created",
    schedule_updated = "schedule_updated",
    schedule_deleted = "schedule_deleted",
    execution_started = "execution_started",
    execution_completed = "execution_completed",
    notification_policy_created = "notification_policy_created",
    notification_policy_updated = "notification_policy_updated",
    notification_policy_deleted = "notification_policy_deleted",
  }
}
