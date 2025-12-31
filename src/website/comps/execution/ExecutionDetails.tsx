import { Prettify } from "@/helpers/Prettify";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Step } from "@/models/Step";
import { Icon } from "../Icon";
import { StepTranslation } from "@/website/translation/StepTranslation";
import { Action } from "@/models/Action";
import { BetterOmit } from "@/types/BetterOmit";

type Props = {
  execution: Execution;
};
export function ExecutionDetails({ execution }: Props) {
  const failedActions = Internal.convertToFailedActions(execution.actions);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">Started</p>
        <code className="text-c-info">{Prettify.timestamp(execution.startedAt)}</code>
      </div>
      {execution.result && (
        <>
          <div>
            <p className="font-semibold">Completed</p>
            <code className="text-c-info">{Prettify.timestamp(execution.result.completedAt)}</code>
          </div>
          <div>
            <p className="font-semibold">Duration</p>
            <code className="text-c-info">{Prettify.duration(execution.result.duration)}</code>
          </div>
        </>
      )}
      {failedActions.map(({ stepType, stepTypeIndex, error }) => (
        <div>
          <p className="flex items-center gap-1">
            <Icon variant="error" className="size-4" />
            <span className="font-semibold">{StepTranslation.type(stepType as Step.Type) || stepType}</span>
            {stepTypeIndex > 0 && <span>(#{stepTypeIndex + 1})</span>}
          </p>
          <pre className="min-w-0 whitespace-pre-wrap break-all p-1 bg-c-dim/20 rounded m-0">{error}</pre>
        </div>
      ))}
    </div>
  );
}

namespace Internal {
  type FailedAction = {
    stepType: string;
    stepTypeIndex: number;
    stepTypeTotal: number;
    error: string;
  };
  export function convertToFailedActions(actions: Action[]): FailedAction[] {
    const indexCounterPerStepType = new Map<string, number>();
    return actions
      .filter((action) => action.result?.outcome === Outcome.error)
      .map<BetterOmit<FailedAction, "stepTypeTotal">>(({ stepType, result }) => {
        const stepTypeIndex = indexCounterPerStepType.get(stepType) || 0;
        indexCounterPerStepType.set(stepType, stepTypeIndex + 1);
        return {
          stepType,
          stepTypeIndex,
          error: result!.errorMessage!,
        };
      })
      .map<FailedAction>((failedAction) => ({
        ...failedAction,
        stepTypeTotal: indexCounterPerStepType.get(failedAction.stepType)! + 1,
      }));
  }
}
