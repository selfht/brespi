import { Execution } from "@/models/Execution";
import { ProblemDetails } from "@/models/ProblemDetails";
import { ExecutionClient } from "@/website/clients/ExecutionClient";
import { QueryKey } from "@/website/clients/QueryKey";
import { useRegistry } from "@/website/hooks/useRegistry";
import { useQuery } from "@tanstack/react-query";
import { ErrorDump } from "../ErrorDump";
import { Spinner } from "../Spinner";
import { SquareIcon } from "../SquareIcon";
import { Outcome } from "@/models/Outcome";

type Props = {
  pipelineId: string;
};
export function ExecutionPanel({ pipelineId }: Props) {
  const executionClient = useRegistry(ExecutionClient);

  /**
   * Data
   */
  const queryKey = [QueryKey.executions];
  const query = useQuery<Execution[], ProblemDetails>({
    queryKey,
    queryFn: () => executionClient.query({ pipelineId }),
  });

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
          <button key={execution.id} className="mt-4 flex items-center text-left gap-4 group cursor-pointer">
            <SquareIcon variant={execution.result?.outcome || "loading"} className="group-hover:border-white group-hover:bg-c-dim/20" />
            <div>
              <h3 className="text-base font-medium group-hover:text-white">
                {execution.result
                  ? execution.result.outcome === Outcome.success
                    ? "Successfully executed"
                    : "Failed to execute"
                  : "Executing ..."}
              </h3>
              <p className="font-light italic text-c-dim">
                {execution.result
                  ? `Completed ${execution.result.completedAt.toLocaleString()}`
                  : `Started ${execution.startedAt.toLocaleString()}`}
              </p>
            </div>
          </button>
        ))}
        {query.data.length === 0 && <SquareIcon variant="no_data" />}
      </div>
      {query.data.length > 0 && (
        <div className="flex-1 p-6">
          <h2 className="mb-6 text-xl font-extralight">Execution Details</h2>
          <p className="text-c-dim font-extralight">Select an execution to see its details.</p>
        </div>
      )}
    </div>
  );
}
