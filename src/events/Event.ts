import { Configuration } from "@/models/Configuration";
import { Execution } from "@/models/Execution";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { Temporal } from "node_modules/@js-temporal/polyfill/index.cjs";

export type Event =
  // configuration
  | Event.ConfigurationUpdated
  // pipelines
  | Event.PipelineCreated
  | Event.PipelineUpdated
  | Event.PipelineDeleted
  // schedules
  | Event.ScheduleCreated
  | Event.ScheduleUpdated
  | Event.ScheduleDeleted
  // executions
  | Event.ExecutionStarted
  | Event.ExecutionCompleted
  // notification policies
  | Event.NotificationPolicyCreated
  | Event.NotificationPolicyUpdated
  | Event.NotificationPolicyDeleted;

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

  type Instance<T extends Event.Type, D> = {
    id: string;
    object: "event";
    published: Temporal.PlainDateTime;
    type: T;
    data: D;
  };

  // configuration
  export type ConfigurationUpdated = Instance<
    Event.Type.configuration_updated,
    { configuration: Configuration; trigger: "application" | "disk_synchronization" }
  >;
  // pipelines
  export type PipelineCreated = Instance<Event.Type.pipeline_created, { pipeline: Pipeline }>;
  export type PipelineUpdated = Instance<Event.Type.pipeline_updated, { pipeline: Pipeline }>;
  export type PipelineDeleted = Instance<Event.Type.pipeline_deleted, { pipeline: Pipeline }>;
  // schedules
  export type ScheduleCreated = Instance<Event.Type.schedule_created, { schedule: Schedule }>;
  export type ScheduleUpdated = Instance<Event.Type.schedule_updated, { schedule: Schedule }>;
  export type ScheduleDeleted = Instance<Event.Type.schedule_deleted, { schedule: Schedule }>;
  // executions
  export type ExecutionStarted = Instance<Event.Type.execution_started, { execution: Execution; trigger: "ad_hoc" | "schedule" }>;
  export type ExecutionCompleted = Instance<Event.Type.execution_completed, { execution: Execution; trigger: "ad_hoc" | "schedule" }>;
  // notification policies
  export type NotificationPolicyCreated = Instance<Event.Type.notification_policy_created, { policy: NotificationPolicy }>;
  export type NotificationPolicyUpdated = Instance<Event.Type.notification_policy_updated, { policy: NotificationPolicy }>;
  export type NotificationPolicyDeleted = Instance<Event.Type.notification_policy_deleted, { policy: NotificationPolicy }>;
}
