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
    await this.createMetadata({
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
      await this.updateMetadata({
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
    const schedules = coreSchedules.map<Schedule>((s) => {
      const meta = metadatas.find((m) => m.id === s.id);
      if (!meta) {
        throw new Error(`Missing schedule metadata; id=${s.id}`);
      }
      return {
        ...s,
        active: meta.active,
      };
    });
    return Array.isArray(singleOrPlural) ? schedules : schedules[0];
  }

  private async createMetadata(metadata: Schedule.Metadata): Promise<void> {
    await this.sqlite.insert($scheduleMetadata).values(ScheduleMetadataConverter.convert(metadata));
  }

  private async updateMetadata(metadata: Schedule.Metadata): Promise<void> {
    await this.sqlite
      .update($scheduleMetadata)
      .set(ScheduleMetadataConverter.convert(metadata))
      .where(eq($scheduleMetadata.id, metadata.id));
  }

  private async deleteMetadata(id: string): Promise<void> {
    await this.sqlite.delete($scheduleMetadata).where(eq($scheduleMetadata.id, id));
  }
}
