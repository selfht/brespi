import { ExecutionData } from "@/__testdata__/ExecutionData";
import { PipelineData } from "@/__testdata__/PipelineData";
import { Execution } from "@/models/Execution";

export class ExecutionRepository {
  private readonly REPOSITORY: Execution[] = [
    ExecutionData.SUCCESS_1(PipelineData.POSTGRES_BACKUP.id),
    ExecutionData.SUCCESS_2(PipelineData.POSTGRES_BACKUP.id),
    ExecutionData.ERROR(PipelineData.POSTGRES_BACKUP.id),
    ExecutionData.ERROR(PipelineData.WP_BACKUP.id),
    ExecutionData.SUCCESS_1(PipelineData.WP_BACKUP.id),
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
}
