import { $notificationPolicyMetadata } from "@/drizzle/schema";
import { NotificationPolicy } from "@/models/NotificationPolicy";
import { InferSelectModel } from "drizzle-orm";

export namespace NotificationPolicyMetadataConverter {
  type $NotificationPolicyMetadata = InferSelectModel<typeof $notificationPolicyMetadata>;

  export function convert(metadata: NotificationPolicy.Metadata): $NotificationPolicyMetadata;
  export function convert(metadata: $NotificationPolicyMetadata): NotificationPolicy.Metadata;
  export function convert(metadata: NotificationPolicy.Metadata | $NotificationPolicyMetadata): NotificationPolicy.Metadata | $NotificationPolicyMetadata {
    return "object" in metadata ? toDatabase(metadata) : fromDatabase(metadata);
  }

  function toDatabase(model: NotificationPolicy.Metadata): $NotificationPolicyMetadata {
    return {
      id: model.id,
      active: model.active ? 1 : 0,
    };
  }

  function fromDatabase(db: $NotificationPolicyMetadata): NotificationPolicy.Metadata {
    return {
      id: db.id,
      object: "notification_policy.metadata",
      active: db.active === 1,
    };
  }
}
