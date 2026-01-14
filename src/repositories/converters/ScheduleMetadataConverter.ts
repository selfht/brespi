import { $scheduleMetadata } from "@/drizzle/schema";
import { Schedule } from "@/models/Schedule";
import { InferSelectModel } from "drizzle-orm";

export namespace ScheduleMetadataConverter {
  type $ScheduleMetadata = InferSelectModel<typeof $scheduleMetadata>;

  export function convert(metadata: Schedule.Metadata): $ScheduleMetadata;
  export function convert(metadata: $ScheduleMetadata): Schedule.Metadata;
  export function convert(metadata: Schedule.Metadata | $ScheduleMetadata): Schedule.Metadata | $ScheduleMetadata {
    return "object" in metadata ? toDatabase(metadata) : fromDatabase(metadata);
  }

  function toDatabase(model: Schedule.Metadata): $ScheduleMetadata {
    return {
      id: model.id,
      active: model.active ? 1 : 0,
    };
  }

  function fromDatabase(db: $ScheduleMetadata): Schedule.Metadata {
    return {
      id: db.id,
      object: "schedule.metadata",
      active: db.active === 1,
    };
  }
}
