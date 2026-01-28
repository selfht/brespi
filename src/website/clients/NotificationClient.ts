import { NotificationPolicy } from "@/models/NotificationPolicy";
import { OmitBetter } from "@/types/OmitBetter";
import { Yesttp } from "yesttp";

export class NotificationClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async queryPolicies(): Promise<NotificationPolicy[]> {
    const { body } = await this.yesttp.get("/notification-policies");
    return body.map(NotificationPolicy.parse);
  }

  public async createPolicy(policy: OmitBetter<NotificationPolicy, "id" | "object">): Promise<NotificationPolicy> {
    const { body } = await this.yesttp.post(`/notification-policies`, {
      body: policy,
    });
    return NotificationPolicy.parse(body);
  }

  public async updatePolicy(id: string, policy: OmitBetter<NotificationPolicy, "id" | "object">): Promise<NotificationPolicy> {
    const { body } = await this.yesttp.put(`/notification-policies/${id}`, {
      body: policy,
    });
    return NotificationPolicy.parse(body);
  }

  public async deletePolicy(id: string): Promise<NotificationPolicy> {
    const { body } = await this.yesttp.delete(`/notification-policies/${id}`);
    return NotificationPolicy.parse(body);
  }
}
