import { Schedule } from "@/models/Schedule";
import { ConfigurationRepository } from "./ConfigurationRepository";
import { ScheduleError } from "@/errors/ScheduleError";
import { Sqlite } from "@/drizzle/sqlite";
import { $inactiveSchedule } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export class ScheduleRepository {
  public constructor(
    private readonly configuration: ConfigurationRepository,
    private readonly sqlite: Sqlite,
  ) {}

  public async list(): Promise<Schedule[]> {
    const { schedules } = await this.configuration.read();
    const inactiveSchedules = await this.listInactive();
    return schedules.map((s) => ({
      ...s,
      active: !inactiveSchedules.includes(s.id),
    }));
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
    if (!schedule.active) {
      await this.markInactive(schedule.id);
    }
    return result;
  }

  public async update(schedule: Schedule): Promise<Schedule>;
  public async update(id: string, fn: (schedule: Schedule) => Schedule | Promise<Schedule>): Promise<Schedule>;
  public async update(scheduleOrId: string | Schedule, fn?: (schedule: Schedule) => Schedule | Promise<Schedule>): Promise<Schedule> {
    const id = typeof scheduleOrId === "string" ? scheduleOrId : scheduleOrId.id;
    const { result } = await this.configuration.write(async (configuration) => {
      let existingCore = configuration.schedules.find((s) => s.id === id);
      if (!existingCore) {
        throw ScheduleError.not_found({ id: id });
      }
      const existing: Schedule = {
        ...existingCore,
        active: await this.isActive(existingCore.id),
      };
      const updated: Schedule = typeof scheduleOrId === "string" ? await fn!(existing) : scheduleOrId;
      if (updated.active) {
        await this.markActive(id);
      } else {
        await this.markInactive(id);
      }
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
      const existing: Schedule = {
        ...existingCore,
        active: await this.isActive(existingCore.id),
      };
      return {
        result: existing,
        configuration: {
          ...configuration,
          schedules: configuration.schedules.filter((s) => s.id !== id),
        },
      };
    });
    await this.markActive(id);
    return result;
  }

  private async listInactive(): Promise<string[]> {
    return await this.sqlite.query.$inactiveSchedule.findMany().then((rows) => rows.map(({ id }) => id));
  }

  private async isActive(id: string): Promise<boolean> {
    return !Boolean(
      await this.sqlite.query.$inactiveSchedule.findFirst({
        where: eq($inactiveSchedule.id, id),
      }),
    );
  }

  private async markActive(id: string): Promise<void> {
    await this.sqlite.delete($inactiveSchedule).where(eq($inactiveSchedule.id, id));
  }

  private async markInactive(id: string): Promise<void> {
    await this.sqlite.insert($inactiveSchedule).values({ id });
  }
}
