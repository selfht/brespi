import { Configuration } from "@/models/Configuration";
import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { Temporal } from "node_modules/@js-temporal/polyfill/index.cjs";

export type Event =
  // pipelines
  | Instance<"pipeline_created", { pipeline: Pipeline }>
  | Instance<"pipeline_updated", { pipeline: Pipeline }>
  | Instance<"pipeline_deleted", { pipeline: Pipeline }>
  // schedules
  | Instance<"schedule_created", { schedule: Schedule }>
  | Instance<"schedule_updated", { schedule: Schedule }>
  | Instance<"schedule_deleted", { schedule: Schedule }>
  // configuration
  | Instance<"configuration_updated", { configuration: Configuration; origin: "application" | "disk_synchronization" }>;

type Instance<T extends string, D> = {
  id: string;
  object: "event";
  published: Temporal.PlainDateTime;
  type: T;
  data: D;
};
