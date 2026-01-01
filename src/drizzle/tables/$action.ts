import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { $execution } from "./$execution";

export const $action = sqliteTable("action", {
  id: text().primaryKey(),
  executionId: text().notNull(),
  stepId: text().notNull(),
  stepType: text().notNull(),
  previousStepId: text(),
  startedAt: text(),
  resultOutcome: text(),
  resultDurationMs: integer(),
  resultCompletedAt: text(),
  resultArtifactsConsumed: text(),
  resultArtifactsProduced: text(),
  resultErrorMessage: text(),
});

export const $actionRelations = relations($action, ({ one }) => ({
  execution: one($execution, {
    fields: [$action.executionId],
    references: [$execution.id],
  }),
}));
