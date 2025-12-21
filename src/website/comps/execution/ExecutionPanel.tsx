import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { ProblemDetails } from "@/models/ProblemDetails";
import { UseQueryResult } from "@tanstack/react-query";
import { ErrorDump } from "../ErrorDump";
import { Spinner } from "../Spinner";
import { SquareIcon } from "../SquareIcon";
import { useCallback } from "react";
import clsx from "clsx";

type Props = {
  query: UseQueryResult<Execution[], ProblemDetails>;
  selectedExecution: Execution | undefined;
  onSelect: (execution: Execution) => unknown;
  onDeselect: () => unknown;
};
export function ExecutionPanel({ query, selectedExecution, onSelect, onDeselect }: Props) {
  const onExecutionClick = useCallback(
    (execution: Execution) => {
      if (execution.id === selectedExecution?.id) {
        onDeselect();
      } else {
        onSelect(execution);
      }
    },
    [selectedExecution?.id],
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
        <h2 className="mb-6 text-xl font-extralight">Execution History</h2>
        {query.data.map((execution) => (
          <button
            key={execution.id}
            className={clsx("mt-4 flex items-center text-left gap-4 group cursor-pointer", {
              "opacity-40": selectedExecution && execution.id !== selectedExecution.id,
            })}
            onClick={() => onExecutionClick(execution)}
          >
            <SquareIcon
              variant={execution.result?.outcome || "loading"}
              className={clsx("group-hover:border-white group-hover:bg-c-dim/20", {
                "border-white bg-c-dim/20": execution.id === selectedExecution?.id,
              })}
            />
            <div>
              <h3
                className={clsx("text-base font-medium group-hover:text-white", {
                  "text-white": execution.id === selectedExecution?.id,
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
                  ? `Completed on ${execution.result.completedAt.toLocaleString()}`
                  : `Started on ${execution.startedAt.toLocaleString()}`}
              </p>
            </div>
          </button>
        ))}
        {query.data.length === 0 && <SquareIcon variant="no_data" />}
      </div>
      {query.data.length > 0 && (
        <div className="flex-1 p-6">
          <h2 className="mb-6 text-xl font-extralight">Execution Details</h2>
          <p className="text-c-dim font-extralight">Select an execution on the left to see its details.</p>
        </div>
      )}
    </div>
  );
}
