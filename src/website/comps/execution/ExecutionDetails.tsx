import { Prettify } from "@/helpers/Prettify";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";

type Props = {
  execution: Execution;
};
export function ExecutionDetails({ execution }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {execution.result ? (
        <p>
          Started on <span className="text-c-info">{Prettify.timestamp(execution.startedAt)}</span> and completed on{" "}
          <span className="text-c-info">{Prettify.timestamp(execution.result.completedAt)}</span> for a total duration of{" "}
          <span className="text-c-info">{Prettify.duration(execution.result.duration)}</span>
        </p>
      ) : (
        <p>
          Started on <span className="font-semibold">{Prettify.timestamp(execution.startedAt)}</span>
        </p>
      )}
      {execution.result && (
        <p>
          {execution.result.outcome === Outcome.success ? (
            <span>
              All steps in this pipeline have <span className="text-c-success">succeeded</span>.
            </span>
          ) : (
            <span>
              Some steps in this pipeline have <span className="text-c-error">failed</span>. See details below.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
