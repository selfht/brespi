import { $action } from "@/drizzle/schema";
import { Action } from "@/models/Action";
import { Outcome } from "@/models/Outcome";
import { Temporal } from "@js-temporal/polyfill";
import { InferSelectModel } from "drizzle-orm";

export namespace ActionConverter {
  type $Action = InferSelectModel<typeof $action>;

  export function convert(action: Action): $Action;
  export function convert(action: $Action): Action;
  export function convert(action: Action | $Action): Action | $Action {
    return "object" in action ? toDatabase(action) : fromDatabase(action);
  }

  function toDatabase(model: Action): $Action {
    return {
      id: model.id,
      executionId: model.executionId,
      stepId: model.stepId,
      stepType: model.stepType,
      previousStepId: model.previousStepId ?? null,
      startedAt: model.startedAt?.toString() ?? null,
      resultOutcome: model.result?.outcome ?? null,
      resultDurationMs: model.result ? Math.round(model.result.duration.total({ unit: "milliseconds" })) : null,
      resultCompletedAt: model.result?.completedAt.toString() ?? null,
      resultArtifactsConsumed: model.result?.consumed ? JSON.stringify(model.result.consumed) : null,
      resultArtifactsProduced: model.result?.produced ? JSON.stringify(model.result.produced) : null,
      resultErrorMessage: model.result?.errorMessage ?? null,
    };
  }

  function fromDatabase(db: $Action): Action {
    return {
      id: db.id,
      object: "action",
      executionId: db.executionId,
      stepId: db.stepId,
      stepType: db.stepType,
      previousStepId: db.previousStepId ?? undefined,
      startedAt: db.startedAt ? Temporal.PlainDateTime.from(db.startedAt) : undefined,
      result:
        db.resultOutcome && db.resultDurationMs !== null && db.resultCompletedAt
          ? {
              outcome: db.resultOutcome as Outcome,
              duration: Temporal.Duration.from({ milliseconds: db.resultDurationMs }),
              completedAt: Temporal.PlainDateTime.from(db.resultCompletedAt),
              consumed: db.resultArtifactsConsumed ? JSON.parse(db.resultArtifactsConsumed) : [],
              produced: db.resultArtifactsProduced ? JSON.parse(db.resultArtifactsProduced) : [],
              errorMessage: db.resultErrorMessage ?? undefined,
            }
          : undefined,
    };
  }
}
