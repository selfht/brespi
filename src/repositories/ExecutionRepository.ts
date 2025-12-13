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

  public async query({ pipelineIds }: QueryRequest): Promise<Execution[]> {
    return this.REPOSITORY.filter(({ pipelineId }) => pipelineIds.includes(pipelineId));
  }

  public async find(id: string): Promise<Execution | undefined> {
    return this.REPOSITORY.find((e) => e.id === id);
  }
}

type QueryRequest = {
  pipelineIds: string[];
};
