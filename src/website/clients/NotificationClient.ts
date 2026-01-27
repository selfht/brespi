import { NotificationPolicy } from "@/models/NotificationPolicy";
import { Schedule } from "@/models/Schedule";
import { OmitBetter } from "@/types/OmitBetter";
import { Yesttp } from "yesttp";

export class NotificationClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async queryPolicies(): Promise<NotificationPolicy[]> {
    const { body } = await this.yesttp.get("/notification-policies");
    return body.map(NotificationPolicy.parse);
  }

  public async createPolicy(schedule: OmitBetter<NotificationPolicy, "id" | "object">): Promise<NotificationPolicy> {
    const { body } = await this.yesttp.post(`/notification-policies`, {
      body: schedule,
    });
    return NotificationPolicy.parse(body);
  }

  public async update(id: string, schedule: OmitBetter<Schedule, "id" | "object">): Promise<NotificationPolicy> {
    const { body } = await this.yesttp.put(`/notification-policies/${id}`, {
      body: schedule,
    });
    return NotificationPolicy.parse(body);
  }

  public async delete(id: string): Promise<NotificationPolicy> {
    const { body } = await this.yesttp.delete(`/notification-policies/${id}`);
    return NotificationPolicy.parse(body);
  }
}
