import { $scheduleMetadata } from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { ScheduleError } from "@/errors/ScheduleError";
import { Schedule } from "@/models/Schedule";
import { eq, inArray } from "drizzle-orm";
import { ConfigurationRepository } from "./ConfigurationRepository";
import { ScheduleMetadataConverter } from "./converters/ScheduleMetadataConverter";

export class ScheduleRepository {
  public constructor(
    private readonly configuration: ConfigurationRepository,
    private readonly sqlite: Sqlite,
  ) {}

  public async list(): Promise<Schedule[]> {
    const { schedules } = await this.configuration.read();
    return await this.joinMetadata(schedules);
  }

  public async query(q: { pipelineId: string }): Promise<Schedule[]> {
    const { schedules } = await this.configuration.read();
    return await this.joinMetadata(schedules.filter((s) => s.pipelineId === q.pipelineId));
  }

  public async create(schedule: Schedule): Promise<Schedule> {
    const { result } = await this.configuration.write((configuration) => {
      if (configuration.schedules.some((s) => s.id === schedule.id)) {
        throw ScheduleError.already_exists({ id: schedule.id });
      }
      return {
        result: schedule,
        configuration: {
          ...configuration,
          schedules: [schedule, ...configuration.schedules],
        },
      };
    });
    await this.upsertMetadata({
      id: result.id,
      object: "schedule.metadata",
      active: result.active,
    });
    return result;
  }

  public async update(schedule: Schedule): Promise<Schedule>;
  public async update(id: string, fn: (schedule: Schedule) => Schedule | Promise<Schedule>): Promise<Schedule>;
  public async update(scheduleOrId: string | Schedule, fn?: (schedule: Schedule) => Schedule | Promise<Schedule>): Promise<Schedule> {
    const id = typeof scheduleOrId === "string" ? scheduleOrId : scheduleOrId.id;
    const { result } = await this.configuration.write(async (configuration) => {
      let existingCoreSchedule = configuration.schedules.find((s) => s.id === id);
      if (!existingCoreSchedule) {
        throw ScheduleError.not_found({ id: id });
      }
      const existingSchedule = await this.joinMetadata(existingCoreSchedule);
      const updated: Schedule = typeof scheduleOrId === "string" ? await fn!(existingSchedule) : scheduleOrId;
      await this.upsertMetadata({
        id: updated.id,
        object: "schedule.metadata",
        active: updated.active,
      });
      return {
        result: updated,
        configuration: {
          ...configuration,
          schedules: configuration.schedules.map((s) => {
            if (s.id === id) {
              return updated;
            }
            return s;
          }),
        },
      };
    });
    return result;
  }

  public async remove(id: string): Promise<Schedule> {
    const { result } = await this.configuration.write(async (configuration) => {
      const existingCore = configuration.schedules.find((s) => s.id === id);
      if (!existingCore) {
        throw ScheduleError.not_found({ id });
      }
      const existing = await this.joinMetadata(existingCore);
      return {
        result: existing,
        configuration: {
          ...configuration,
          schedules: configuration.schedules.filter((s) => s.id !== id),
        },
      };
    });
    await this.deleteMetadata(id);
    return result;
  }

  public async synchronizeWithUpdatedConfiguration(coreSchedules: Schedule.Core[]): Promise<Schedule[]> {
    // 0. Get the available metadata
    let metadatas = await this.listMetadatas();
    // 1. Insert missing metadatas
    const schedulesWithMissingMetadata = coreSchedules.filter((cs) => !metadatas.some((m) => cs.id === m.id));
    const missingMetadatas = await this.insertMissingMetadatas(schedulesWithMissingMetadata);
    metadatas = [...metadatas, ...missingMetadatas];
    // 2. Delete superfluous metadatas
    const superfluousMetadatasWithoutSchedule = metadatas.filter((m) => !coreSchedules.some((cs) => m.id === cs.id)).map(({ id }) => id);
    await this.sqlite.delete($scheduleMetadata).where(inArray($scheduleMetadata.id, superfluousMetadatasWithoutSchedule));
    metadatas = metadatas.filter((m) => !superfluousMetadatasWithoutSchedule.includes(m.id));
    // 3. Return the latest state
    return this.combine(coreSchedules, metadatas);
  }

  private async joinMetadata(schedule: Schedule.Core): Promise<Schedule>;
  private async joinMetadata(schedules: Schedule.Core[]): Promise<Schedule[]>;
  private async joinMetadata(singleOrPlural: Schedule.Core | Schedule.Core[]): Promise<Schedule | Schedule[]> {
    const coreSchedules: Schedule.Core[] = Array.isArray(singleOrPlural) ? singleOrPlural : [singleOrPlural];
    const metadatas = await this.sqlite.query.$scheduleMetadata
      .findMany({
        where: inArray(
          $scheduleMetadata.id,
          coreSchedules.map(({ id }) => id),
        ),
      })
      .then((data) => data.map(ScheduleMetadataConverter.convert));
    // START intermezzo: check if we're missing metadata information for schedules (this is possible)
    const coreSchedulesWithoutMetadata = coreSchedules.filter((cs) => !metadatas.some((m) => cs.id === m.id));
    const missingMetadatas = await this.insertMissingMetadatas(coreSchedulesWithoutMetadata);
    metadatas.push(...missingMetadatas);
    // END intermezzo
    const result = this.combine(coreSchedules, metadatas);
    return Array.isArray(singleOrPlural) ? result : result[0];
  }

  private async insertMissingMetadatas(coreSchedulesWithoutMetadata: Schedule.Core[]): Promise<Schedule.Metadata[]> {
    const missingMetadatas = coreSchedulesWithoutMetadata.map(({ id }) => Schedule.Metadata.standard(id));
    if (missingMetadatas.length > 0) {
      // otherwise drizzle throws an error
      await this.sqlite
        .insert($scheduleMetadata) //
        .values(missingMetadatas.map((m) => ScheduleMetadataConverter.convert(m)));
    }
    return missingMetadatas;
  }

  private combine(coreSchedules: Schedule.Core[], metadatas: Schedule.Metadata[]): Schedule[] {
    return coreSchedules.map<Schedule>((coreSchedule) => {
      const meta = metadatas.find((m) => m.id === coreSchedule.id);
      if (!meta) {
        throw new Error(`Missing schedule metadata; id=${coreSchedule.id}`);
      }
      return {
        ...coreSchedule,
        active: meta.active,
      };
    });
  }

  private async listMetadatas(): Promise<Schedule.Metadata[]> {
    const metadatas = await this.sqlite.query.$scheduleMetadata.findMany();
    return metadatas.map(ScheduleMetadataConverter.convert);
  }

  private async upsertMetadata(metadata: Schedule.Metadata): Promise<void> {
    const data = ScheduleMetadataConverter.convert(metadata);
    await this.sqlite
      .insert($scheduleMetadata) //
      .values(data)
      .onConflictDoUpdate({
        target: $scheduleMetadata.id,
        set: data,
      });
  }

  private async deleteMetadata(id: string): Promise<void> {
    await this.sqlite.delete($scheduleMetadata).where(eq($scheduleMetadata.id, id));
  }
}
