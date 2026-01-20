import { Schedule } from "@/models/Schedule";
import { OmitBetter } from "@/types/OmitBetter";
import { Temporal } from "@js-temporal/polyfill";
import { Cron } from "croner";
import { Yesttp } from "yesttp";

export class ScheduleClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(): Promise<Schedule[]> {
    const { body } = await this.yesttp.get("/schedules");
    return body.map(Schedule.parse);
  }

  public async create(schedule: OmitBetter<Schedule, "id" | "object">): Promise<Schedule> {
    const { body } = await this.yesttp.post(`/schedules`, {
      body: schedule,
    });
    return Schedule.parse(body);
  }

  public async update(id: string, schedule: OmitBetter<Schedule, "id" | "object">): Promise<Schedule> {
    const { body } = await this.yesttp.put(`/schedules/${id}`, {
      body: schedule,
    });
    return Schedule.parse(body);
  }

  public async delete(id: string): Promise<Schedule> {
    const { body } = await this.yesttp.delete(`/schedules/${id}`);
    return Schedule.parse(body);
  }

  public nextCronEvaluations({ expression, amount }: { expression: string; amount: number }): Temporal.PlainDateTime[] | undefined {
    let cron: Cron | undefined = undefined;
    try {
      cron = new Cron(expression);
      // Round down to current second for stable results within the same second
      const roundedNow = new Date(Math.floor(Date.now() / 1000) * 1000);
      return cron.nextRuns(amount, roundedNow).map((date) =>
        Temporal.Instant.fromEpochMilliseconds(date.getTime())
          .toZonedDateTimeISO(Temporal.Now.timeZoneId()) //
          .toPlainDateTime(),
      );
    } catch (e) {
      return undefined;
    } finally {
      cron?.stop();
    }
  }
}
