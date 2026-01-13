import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const $inactiveSchedule = sqliteTable("inactive_schedule", {
  id: text().primaryKey(),
});
