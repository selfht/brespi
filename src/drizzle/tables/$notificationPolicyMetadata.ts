import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const $notificationPolicyMetadata = sqliteTable("notification_policy_metadata", {
  id: text().primaryKey(),
  active: integer(),
});
