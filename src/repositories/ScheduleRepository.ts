import { $scheduleMetadata } from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { ScheduleError } from "@/errors/ScheduleError";
import { Schedule } from "@/models/Schedule";
import { inArray } from "drizzle-orm";
import { ConfigurationRepository } from "./ConfigurationRepository";
import { ScheduleMetadataConverter } from "./converters/ScheduleMetadataConverter";
import { HybridHelper } from "./HybridHelper";

export class ScheduleRepository {
  private readonly hybridHelper: HybridHelper<Schedule, Schedule.Core, Schedule.Metadata>;

  public constructor(
    private readonly configuration: ConfigurationRepository,
    private readonly sqlite: Sqlite,
  ) {
    this.hybridHelper = new HybridHelper({
      combineFn: (core, { active }) => ({ ...core, active }),
      standardMetaFn: ({ id }) => Schedule.Metadata.standard(id),
      listMetasFn: () => this.sqlite.query.$scheduleMetadata.findMany().then((data) => data.map(ScheduleMetadataConverter.convert)),
      queryMetasFn: ({ ids }) =>
        this.sqlite.query.$scheduleMetadata
          .findMany({ where: inArray($scheduleMetadata.id, ids) })
          .then((data) => data.map(ScheduleMetadataConverter.convert)),
      insertMetasFn: (metas) => this.sqlite.insert($scheduleMetadata).values(metas.map((m) => ScheduleMetadataConverter.convert(m))),
      deleteMetasFn: ({ ids }) => this.sqlite.delete($scheduleMetadata).where(inArray($scheduleMetadata.id, ids)),
    });
  }

  public async query(q?: { pipelineId: string }): Promise<Schedule[]> {
    let { schedules } = await this.configuration.read();
    if (q) {
      schedules = schedules.filter((s) => s.pipelineId === q.pipelineId);
    }
    return await this.hybridHelper.joinMetadata(schedules);
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

  public async update(schedule: Schedule): Promise<Schedule> {
    await this.configuration.write(async (configuration) => {
      if (!configuration.schedules.some((s) => s.id === schedule.id)) {
        throw ScheduleError.not_found({ id: schedule.id });
      }
      await this.upsertMetadata({
        id: schedule.id,
        object: "schedule.metadata",
        active: schedule.active,
      });
      return {
        result: schedule,
        configuration: {
          ...configuration,
          schedules: configuration.schedules.map((s) => {
            if (s.id === schedule.id) {
              return schedule;
            }
            return s;
          }),
        },
      };
    });
    return schedule;
  }

  public async delete(id: string): Promise<Schedule> {
    const { result } = await this.configuration.write(async (configuration) => {
      const existingCore = configuration.schedules.find((s) => s.id === id);
      if (!existingCore) {
        throw ScheduleError.not_found({ id });
      }
      const existing = await this.hybridHelper.joinMetadata(existingCore);
      return {
        result: existing,
        configuration: {
          ...configuration,
          schedules: configuration.schedules.filter((s) => s.id !== id),
        },
      };
    });
    await this.hybridHelper.deleteMetadata(id);
    return result;
  }

  public async synchronizeWithUpdatedConfiguration(coreSchedules: Schedule.Core[]): Promise<Schedule[]> {
    return this.hybridHelper.synchronizeWithUpdatedConfiguration(coreSchedules);
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
}
