import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { $action } from "./$action";
import { relations } from "drizzle-orm";

export const $execution = sqliteTable("execution", {
  id: text().primaryKey(),
  pipelineId: text().notNull(),
  startedAt: text().notNull(),
  resultOutcome: text(),
  resultDurationMs: integer(),
  resultCompletedAt: text(),
});

export const $executionRelations = relations($execution, ({ many }) => ({
  actions: many($action),
}));
