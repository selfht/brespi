import { Schedule } from "@/models/Schedule";
import { Yesttp } from "yesttp";

export class ScheduleClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(): Promise<Schedule[]> {
    const { body } = await this.yesttp.get("/schedules");
    return body.map(Schedule.parse);
  }

  public async create(schedule: Omit<Schedule, "id">): Promise<Schedule> {
    const { body } = await this.yesttp.post(`/schedules`, {
      body: schedule,
    });
    return Schedule.parse(body);
  }

  public async update(id: string, schedule: Schedule): Promise<Schedule> {
    const { body } = await this.yesttp.put(`/schedules/${id}`, {
      body: schedule,
    });
    return Schedule.parse(body);
  }

  public async delete(id: string): Promise<Schedule> {
    const { body } = await this.yesttp.delete(`/schedules/${id}`);
    return Schedule.parse(body);
  }
}
