import { ExecutionData } from "@/__testdata__/ExecutionData";
import { PipelineData } from "@/__testdata__/PipelineData";
import { Execution } from "@/models/Execution";
import { InMemoryRepository } from "./InMemoryRepository";

export class ExecutionRepository extends InMemoryRepository<Execution> {
  public constructor() {
    super([
      ExecutionData.PENDING(PipelineData.WORK_IN_PROGRESS.id),
      ExecutionData.SUCCESS(PipelineData.POSTGRES_BACKUP.id),
      ExecutionData.SUCCESS(PipelineData.POSTGRES_BACKUP.id),
      ExecutionData.ERROR(PipelineData.POSTGRES_BACKUP.id),
      ExecutionData.ERROR(PipelineData.WORDPRESS_BACKUP.id),
      ExecutionData.SUCCESS(PipelineData.WORDPRESS_BACKUP.id),
    ]);
  }

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    return this.storage.filter((e) => e.pipelineId === q.pipelineId);
  }

  public async queryLastExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
    const result = new Map<string, Execution | null>();
    for (const pipelineId of q.pipelineIds) {
      const lastExecution = this.storage.find((e) => e.pipelineId === pipelineId);
      result.set(pipelineId, lastExecution || null);
    }
    return result;
  }
}
