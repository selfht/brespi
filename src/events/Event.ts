import { Configuration } from "@/models/Configuration";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { Temporal } from "node_modules/@js-temporal/polyfill/index.cjs";

export type Event =
  // configuration
  | Instance<"configuration_updated", { configuration: Configuration; origin: "application" | "disk_synchronization" }>
  // pipelines
  | Instance<"pipeline_created", { pipeline: Pipeline }>
  | Instance<"pipeline_updated", { pipeline: Pipeline }>
  | Instance<"pipeline_deleted", { pipeline: Pipeline }>
  // schedules
  | Instance<"schedule_created", { schedule: Schedule }>
  | Instance<"schedule_updated", { schedule: Schedule }>
  | Instance<"schedule_deleted", { schedule: Schedule }>
  // executions
  | Instance<"execution_started", { execution: Execution }>
  | Instance<"execution_completed", { execution: Execution }>;

type Instance<T extends string, D> = {
  id: string;
  object: "event";
  published: Temporal.PlainDateTime;
  type: T;
  data: D;
};
