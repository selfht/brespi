import { ExecutionData } from "@/__testdata__/ExecutionData";
import { PipelineData } from "@/__testdata__/PipelineData";
import { Execution } from "@/models/Execution";
import { InMemoryRepository } from "./InMemoryRepository";

export class ExecutionRepository extends InMemoryRepository<Execution> {
  public constructor() {
    super(
      [
        ExecutionData.PENDING(PipelineData.WORK_IN_PROGRESS.id),
        ExecutionData.SUCCESS(PipelineData.POSTGRES.id),
        ExecutionData.SUCCESS(PipelineData.POSTGRES.id),
        ExecutionData.ERROR(PipelineData.POSTGRES.id),
        ExecutionData.ERROR(PipelineData.WORDPRESS.id),
        ExecutionData.SUCCESS(PipelineData.WORDPRESS.id),
      ].sort(Execution.sort),
    );
  }

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    return this.storage.filter((e) => e.pipelineId === q.pipelineId).toSorted(Execution.sort);
  }

  public async queryMostRecentExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
    const result = new Map<string, Execution | null>();
    for (const pipelineId of q.pipelineIds) {
      const mostRecentExecution = this.storage.toSorted(Execution.sort).find((e) => e.pipelineId === pipelineId);
      result.set(pipelineId, mostRecentExecution || null);
    }
    return result;
  }
}
