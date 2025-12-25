import { Prettify } from "@/helpers/Prettify";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { ProblemDetails } from "@/models/ProblemDetails";
import { useYesQuery } from "@/website/hooks/useYesQuery";
import clsx from "clsx";
import { useCallback } from "react";
import { ErrorDump } from "../ErrorDump";
import { Spinner } from "../Spinner";
import { SquareIcon } from "../SquareIcon";
import { ExecutionDetails } from "./ExecutionDetails";

type Props = {
  query: useYesQuery.Result<Execution[], ProblemDetails>;
  selectedExecutionId: string | undefined;
  onSelect: (executionId: string) => unknown;
  onDeselect: () => unknown;
};
export function ExecutionPanel({ query, selectedExecutionId, onSelect, onDeselect }: Props) {
  const selectedExecution = query.data?.find((e) => e.id === selectedExecutionId);
  const onExecutionClick = useCallback(
    (execution: Execution) => {
      if (execution.id === selectedExecutionId) {
        onDeselect();
      } else {
        onSelect(execution.id);
      }
    },
    [selectedExecutionId],
  );
  if (query.error) {
    return (
      <div className="p-6 text-center">
        <ErrorDump error={query.error} />
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="p-6 text-center">
        <Spinner />
      </div>
    );
  }
  return (
    <div className="flex items-start">
      <div className="flex-1 p-6">
        <h2 className="mb-6 text-xl font-extralight">Execution history</h2>
        {query.data.map((execution) => (
          <button
            key={execution.id}
            className={clsx("mt-4 flex items-center text-left gap-4 group cursor-pointer", {
              "opacity-40": selectedExecutionId && execution.id !== selectedExecutionId,
            })}
            onClick={() => onExecutionClick(execution)}
          >
            <SquareIcon
              variant={execution.result?.outcome || "loading"}
              className={clsx("group-hover:border-white group-hover:bg-c-dim/20", {
                "border-white bg-c-dim/20": execution.id === selectedExecutionId,
              })}
            />
            <div>
              <h3
                className={clsx("text-base font-medium group-hover:text-white", {
                  "text-white": execution.id === selectedExecutionId,
                })}
              >
                {execution.result
                  ? execution.result.outcome === Outcome.success
                    ? "Successfully executed"
                    : "Failed to execute"
                  : "Executing ..."}
              </h3>
              <p className="font-light italic text-c-dim">
                {execution.result
                  ? `Completed on ${Prettify.timestamp(execution.result.completedAt)}`
                  : `Started on ${Prettify.timestamp(execution.startedAt)}`}
              </p>
            </div>
          </button>
        ))}
        {query.data.length === 0 && <SquareIcon variant="no_data" />}
      </div>
      {query.data.length > 0 && (
        <div className="flex-1 p-6">
          <h2 className="mb-6 text-xl font-extralight">
            {selectedExecution && !selectedExecution.result ? (
              <span>
                This execution is <span className="text-sky-100 font-semibold">busy</span> ...
              </span>
            ) : selectedExecution?.result?.outcome === Outcome.success ? (
              <span>
                This execution has <span className="text-c-success font-semibold">succeeded</span>
              </span>
            ) : selectedExecution?.result?.outcome === Outcome.error ? (
              <span>
                This execution has <span className="text-c-error font-semibold">failed</span>
              </span>
            ) : (
              <span>Execution details</span>
            )}
          </h2>
          {selectedExecution ? (
            <ExecutionDetails execution={selectedExecution} />
          ) : (
            <p className="text-c-dim font-extralight">Select an execution on the left to see its details.</p>
          )}
        </div>
      )}
    </div>
  );
}
