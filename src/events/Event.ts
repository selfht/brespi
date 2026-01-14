import { Pipeline } from "@/models/Pipeline";
import { Schedule } from "@/models/Schedule";
import { Temporal } from "node_modules/@js-temporal/polyfill/index.cjs";

export type Event =
  | Instance<"pipeline_created", { pipeline: Pipeline }>
  | Instance<"pipeline_updated", { pipeline: Pipeline }>
  | Instance<"pipeline_deleted", { pipeline: Pipeline }>
  | Instance<"schedule_created", { schedule: Schedule }>
  | Instance<"schedule_updated", { schedule: Schedule }>
  | Instance<"schedule_deleted", { schedule: Schedule }>;

type Instance<T extends string, D> = {
  id: string;
  object: "event";
  published: Temporal.PlainDateTime;
  type: T;
  data: D;
};
