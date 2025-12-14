import { ExecutionData } from "@/__testdata__/ExecutionData";
import { PipelineData } from "@/__testdata__/PipelineData";
import { Execution } from "@/models/Execution";

export class ExecutionRepository {
  private readonly REPOSITORY: Execution[] = [
    ExecutionData.PENDING(PipelineData.WORK_IN_PROGRESS.id),
    ExecutionData.SUCCESS(PipelineData.POSTGRES_BACKUP.id),
    ExecutionData.SUCCESS(PipelineData.POSTGRES_BACKUP.id),
    ExecutionData.ERROR(PipelineData.POSTGRES_BACKUP.id),
    ExecutionData.ERROR(PipelineData.WORDPRESS_BACKUP.id),
    ExecutionData.SUCCESS(PipelineData.WORDPRESS_BACKUP.id),
  ];

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    return this.REPOSITORY.filter((e) => e.pipelineId === q.pipelineId);
  }

  public async queryLastExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
    const result = new Map<string, Execution | null>();
    q.pipelineIds.forEach((pipelineId) => {
      const lastExecution = this.REPOSITORY.find((e) => e.pipelineId === pipelineId);
      result.set(pipelineId, lastExecution || null);
    });
    return result;
  }

  public async find(id: string): Promise<Execution | undefined> {
    return this.REPOSITORY.find((e) => e.id === id);
  }

  public async create(execution: Execution): Promise<Execution | undefined> {
    if (this.REPOSITORY.some((e) => e.id === execution.id)) {
      return undefined;
    }
    this.REPOSITORY.push(execution);
    return execution;
  }
}
