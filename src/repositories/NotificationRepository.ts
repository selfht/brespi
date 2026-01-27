import { NotificationError } from "@/errors/NotificationError";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { ConfigurationRepository } from "./ConfigurationRepository";

export class NotificationRepository {
  public constructor(private readonly configuration: ConfigurationRepository) {}

  public async listPolicies(): Promise<NotificationPolicy[]> {
    return this.configuration.read(({ notificationPolicies }) => notificationPolicies);
  }

  public async createPolicy(policy: NotificationPolicy): Promise<NotificationPolicy> {
    const { result } = await this.configuration.write((configuration) => {
      if (configuration.notificationPolicies.some((p) => p.id === policy.id)) {
        throw NotificationError.policy_already_exists({ id: policy.id });
      }
      return {
        result: policy,
        configuration: {
          ...configuration,
          notificationPolicies: [policy, ...configuration.notificationPolicies],
        },
      };
    });
    return result;
  }

  public async updatePolicy(policy: NotificationPolicy): Promise<NotificationPolicy> {
    const { result } = await this.configuration.write((configuration) => {
      if (!configuration.notificationPolicies.some((p) => p.id === policy.id)) {
        throw NotificationError.policy_not_found({ id: policy.id });
      }
      return {
        result: policy,
        configuration: {
          ...configuration,
          notificationPolicies: configuration.notificationPolicies.map((p) => {
            if (p.id === policy.id) {
              return policy;
            }
            return p;
          }),
        },
      };
    });
    return result;
  }

  public async deletePolicy(id: string): Promise<NotificationPolicy> {
    const { result } = await this.configuration.write((configuration) => {
      const existing = configuration.notificationPolicies.find((p) => p.id === id);
      if (!existing) {
        throw NotificationError.policy_not_found({ id });
      }
      return {
        result: existing,
        configuration: {
          ...configuration,
          notificationPolicies: configuration.notificationPolicies.filter((p) => p.id !== id),
        },
      };
    });
    return result;
  }
}
