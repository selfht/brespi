import { $action, $execution } from "@/drizzle/schema";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Temporal } from "@js-temporal/polyfill";
import { InferSelectModel } from "drizzle-orm";
import { ActionConverter } from "./ActionConverter";

export namespace ExecutionConverter {
  type $Action = InferSelectModel<typeof $action>;
  type $Execution = InferSelectModel<typeof $execution> & {
    actions: $Action[];
  };

  export function convert(execution: Execution): $Execution;
  export function convert(execution: $Execution): Execution;
  export function convert(execution: Execution | $Execution): Execution | $Execution {
    return "object" in execution ? toDatabase(execution) : fromDatabase(execution);
  }

  function toDatabase(model: Execution): $Execution {
    return {
      id: model.id,
      pipelineId: model.pipelineId,
      startedAt: model.startedAt.toString(),
      resultOutcome: model.result?.outcome ?? null,
      resultDurationMs: model.result ? Math.round(model.result.duration.total({ unit: "milliseconds" })) : null,
      resultCompletedAt: model.result?.completedAt.toString() ?? null,
      actions: model.actions.map((action) => ActionConverter.convert(action)),
    };
  }

  function fromDatabase(db: $Execution): Execution {
    return {
      id: db.id,
      object: "execution",
      pipelineId: db.pipelineId,
      startedAt: Temporal.PlainDateTime.from(db.startedAt),
      actions: db.actions.map((action) => ActionConverter.convert(action)),
      result:
        db.resultOutcome && db.resultDurationMs !== null && db.resultCompletedAt
          ? {
              outcome: db.resultOutcome as Outcome,
              duration: Temporal.Duration.from({ milliseconds: db.resultDurationMs }),
              completedAt: Temporal.PlainDateTime.from(db.resultCompletedAt),
            }
          : null,
    };
  }
}
