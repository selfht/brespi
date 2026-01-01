import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const $execution = sqliteTable("execution", {
  id: text().primaryKey(),
  pipelineId: text().notNull(),
  startedAt: text().notNull(),
  resultOutcome: text(),
  resultDurationMs: integer(),
  resultCompletedAt: text(),
});
