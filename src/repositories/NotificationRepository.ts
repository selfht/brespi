import { $notificationPolicyMetadata } from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { NotificationError } from "@/errors/NotificationError";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { eq, inArray } from "drizzle-orm";
import { ConfigurationRepository } from "./ConfigurationRepository";
import { NotificationPolicyMetadataConverter } from "./converters/NotificationPolicyMetadataConverter";

export class NotificationRepository {
  public constructor(
    private readonly configuration: ConfigurationRepository,
    private readonly sqlite: Sqlite,
  ) {}

  public async listPolicies(): Promise<NotificationPolicy[]> {
    const { notificationPolicies } = await this.configuration.read();
    return await this.joinMetadata(notificationPolicies);
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

  public async updatePolicy(policy: NotificationPolicy): Promise<NotificationPolicy>;
  public async updatePolicy(id: string, fn: (policy: NotificationPolicy) => NotificationPolicy | Promise<NotificationPolicy>): Promise<NotificationPolicy>;
  public async updatePolicy(policyOrId: string | NotificationPolicy, fn?: (policy: NotificationPolicy) => NotificationPolicy | Promise<NotificationPolicy>): Promise<NotificationPolicy> {
    const id = typeof policyOrId === "string" ? policyOrId : policyOrId.id;
    const { result } = await this.configuration.write(async (configuration) => {
      const existingCorePolicy = configuration.notificationPolicies.find((p) => p.id === id);
      if (!existingCorePolicy) {
        throw NotificationError.policy_not_found({ id });
      }
      const existingPolicy = await this.joinMetadata(existingCorePolicy);
      const updated: NotificationPolicy = typeof policyOrId === "string" ? await fn!(existingPolicy) : policyOrId;
      await this.upsertMetadata({
        id: updated.id,
        object: "notification_policy.metadata",
        active: updated.active,
      });
      return {
        result: updated,
        configuration: {
          ...configuration,
          notificationPolicies: configuration.notificationPolicies.map((p) => {
            if (p.id === id) {
              return updated;
            }
            return p;
          }),
        },
      };
    });
    return result;
  }

  public async deletePolicy(id: string): Promise<NotificationPolicy> {
    const { result } = await this.configuration.write(async (configuration) => {
      const existingCore = configuration.notificationPolicies.find((p) => p.id === id);
      if (!existingCore) {
        throw NotificationError.policy_not_found({ id });
      }
      const existing = await this.joinMetadata(existingCore);
      return {
        result: existing,
        configuration: {
          ...configuration,
          notificationPolicies: configuration.notificationPolicies.filter((p) => p.id !== id),
        },
      };
    });
    await this.deleteMetadata(id);
    return result;
  }

  public async synchronizeWithUpdatedConfiguration(corePolicies: NotificationPolicy.Core[]): Promise<NotificationPolicy[]> {
    // 0. Get the available metadata
    let metadatas = await this.listMetadatas();
    // 1. Insert missing metadatas
    const policiesWithMissingMetadata = corePolicies.filter((cp) => !metadatas.some((m) => cp.id === m.id));
    const missingMetadatas = await this.insertMissingMetadatas(policiesWithMissingMetadata);
    metadatas = [...metadatas, ...missingMetadatas];
    // 2. Delete superfluous metadatas
    const superfluousMetadatasWithoutPolicy = metadatas.filter((m) => !corePolicies.some((cp) => m.id === cp.id)).map(({ id }) => id);
    await this.sqlite.delete($notificationPolicyMetadata).where(inArray($notificationPolicyMetadata.id, superfluousMetadatasWithoutPolicy));
    metadatas = metadatas.filter((m) => !superfluousMetadatasWithoutPolicy.includes(m.id));
    // 3. Return the latest state
    return this.combine(corePolicies, metadatas);
  }

  private async joinMetadata(policy: NotificationPolicy.Core): Promise<NotificationPolicy>;
  private async joinMetadata(policies: NotificationPolicy.Core[]): Promise<NotificationPolicy[]>;
  private async joinMetadata(singleOrPlural: NotificationPolicy.Core | NotificationPolicy.Core[]): Promise<NotificationPolicy | NotificationPolicy[]> {
    const corePolicies: NotificationPolicy.Core[] = Array.isArray(singleOrPlural) ? singleOrPlural : [singleOrPlural];
    const metadatas = await this.sqlite.query.$notificationPolicyMetadata
      .findMany({
        where: inArray(
          $notificationPolicyMetadata.id,
          corePolicies.map(({ id }) => id),
        ),
      })
      .then((data) => data.map(NotificationPolicyMetadataConverter.convert));
    // START intermezzo: check if we're missing metadata information for policies (this is possible)
    const corePoliciesWithoutMetadata = corePolicies.filter((cp) => !metadatas.some((m) => cp.id === m.id));
    const missingMetadatas = await this.insertMissingMetadatas(corePoliciesWithoutMetadata);
    metadatas.push(...missingMetadatas);
    // END intermezzo
    const result = this.combine(corePolicies, metadatas);
    return Array.isArray(singleOrPlural) ? result : result[0];
  }

  private async insertMissingMetadatas(corePoliciesWithoutMetadata: NotificationPolicy.Core[]): Promise<NotificationPolicy.Metadata[]> {
    const missingMetadatas = corePoliciesWithoutMetadata.map(({ id }) => NotificationPolicy.Metadata.standard(id));
    if (missingMetadatas.length > 0) {
      // otherwise drizzle throws an error
      await this.sqlite
        .insert($notificationPolicyMetadata)
        .values(missingMetadatas.map((m) => NotificationPolicyMetadataConverter.convert(m)));
    }
    return missingMetadatas;
  }

  private combine(corePolicies: NotificationPolicy.Core[], metadatas: NotificationPolicy.Metadata[]): NotificationPolicy[] {
    return corePolicies.map<NotificationPolicy>((corePolicy) => {
      const meta = metadatas.find((m) => m.id === corePolicy.id);
      if (!meta) {
        throw new Error(`Missing notification policy metadata; id=${corePolicy.id}`);
      }
      return {
        ...corePolicy,
        active: meta.active,
      };
    });
  }

  private async listMetadatas(): Promise<NotificationPolicy.Metadata[]> {
    const metadatas = await this.sqlite.query.$notificationPolicyMetadata.findMany();
    return metadatas.map(NotificationPolicyMetadataConverter.convert);
  }

  private async upsertMetadata(metadata: NotificationPolicy.Metadata): Promise<void> {
    const data = NotificationPolicyMetadataConverter.convert(metadata);
    await this.sqlite
      .insert($notificationPolicyMetadata)
      .values(data)
      .onConflictDoUpdate({
        target: $notificationPolicyMetadata.id,
        set: data,
      });
  }

  private async deleteMetadata(id: string): Promise<void> {
    await this.sqlite.delete($notificationPolicyMetadata).where(eq($notificationPolicyMetadata.id, id));
  }
}
