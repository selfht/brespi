import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const $scheduleMetadata = sqliteTable("schedule_metadata", {
  id: text().primaryKey(),
  active: integer(),
});
