import { $notificationPolicyMetadata } from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { NotificationError } from "@/errors/NotificationError";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { inArray } from "drizzle-orm";
import { ConfigurationRepository } from "./ConfigurationRepository";
import { NotificationPolicyMetadataConverter } from "./converters/NotificationPolicyMetadataConverter";
import { HybridHelper } from "./HybridHelper";

export class NotificationRepository {
  private readonly hybridHelper: HybridHelper<NotificationPolicy, NotificationPolicy.Core, NotificationPolicy.Metadata>;

  public constructor(
    private readonly configuration: ConfigurationRepository,
    private readonly sqlite: Sqlite,
  ) {
    this.hybridHelper = new HybridHelper({
      combineFn: (core, { active }) => ({ ...core, active }),
      standardMetaFn: ({ id }) => NotificationPolicy.Metadata.standard(id),
      listMetasFn: () =>
        this.sqlite.query.$notificationPolicyMetadata.findMany().then((data) => data.map(NotificationPolicyMetadataConverter.convert)),
      queryMetasFn: ({ ids }) =>
        this.sqlite.query.$notificationPolicyMetadata
          .findMany({ where: inArray($notificationPolicyMetadata.id, ids) })
          .then((data) => data.map(NotificationPolicyMetadataConverter.convert)),
      insertMetasFn: (metas) =>
        this.sqlite.insert($notificationPolicyMetadata).values(metas.map((m) => NotificationPolicyMetadataConverter.convert(m))),
      deleteMetasFn: ({ ids }) => this.sqlite.delete($notificationPolicyMetadata).where(inArray($notificationPolicyMetadata.id, ids)),
    });
  }

  public async queryPolicies(): Promise<NotificationPolicy[]> {
    const { notificationPolicies } = await this.configuration.read();
    return await this.hybridHelper.joinMetadata(notificationPolicies);
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
    await this.upsertMetadata({
      id: result.id,
      object: "notification_policy.metadata",
      active: result.active,
    });
    return result;
  }

  public async updatePolicy(policy: NotificationPolicy): Promise<NotificationPolicy> {
    await this.configuration.write(async (configuration) => {
      if (!configuration.notificationPolicies.some((p) => p.id === policy.id)) {
        throw NotificationError.policy_not_found({ id: policy.id });
      }
      await this.upsertMetadata({
        id: policy.id,
        object: "notification_policy.metadata",
        active: policy.active,
      });
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
    return policy;
  }

  public async deletePolicy(id: string): Promise<NotificationPolicy> {
    const { result } = await this.configuration.write(async (configuration) => {
      const existingCore = configuration.notificationPolicies.find((p) => p.id === id);
      if (!existingCore) {
        throw NotificationError.policy_not_found({ id });
      }
      const existing = await this.hybridHelper.joinMetadata(existingCore);
      return {
        result: existing,
        configuration: {
          ...configuration,
          notificationPolicies: configuration.notificationPolicies.filter((p) => p.id !== id),
        },
      };
    });
    await this.hybridHelper.deleteMetadata(id);
    return result;
  }

  public async synchronizeWithUpdatedConfiguration(corePolicies: NotificationPolicy.Core[]): Promise<NotificationPolicy[]> {
    return this.hybridHelper.synchronizeWithUpdatedConfiguration(corePolicies);
  }

  private async upsertMetadata(metadata: NotificationPolicy.Metadata): Promise<void> {
    const data = NotificationPolicyMetadataConverter.convert(metadata);
    await this.sqlite.insert($notificationPolicyMetadata).values(data).onConflictDoUpdate({
      target: $notificationPolicyMetadata.id,
      set: data,
    });
  }
}
