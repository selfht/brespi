import { ExecutionData } from "@/__testdata__/ExecutionData";
import { PipelineData } from "@/__testdata__/PipelineData";
import { Execution } from "@/models/Execution";
import { ExecutionRepository } from "../ExecutionRepository";
import { GenericInMemoryRepository } from "./GenericInMemoryRepository";

export class ExecutionRepositoryDefault implements ExecutionRepository {
  private readonly delegate = new GenericInMemoryRepository<Execution>(
    [
      ExecutionData.PENDING(PipelineData.WORK_IN_PROGRESS.id),
      ExecutionData.SUCCESS(PipelineData.POSTGRES.id),
      ExecutionData.SUCCESS(PipelineData.POSTGRES.id),
      ExecutionData.ERROR(PipelineData.POSTGRES.id),
      ExecutionData.ERROR(PipelineData.WORDPRESS.id),
      ExecutionData.SUCCESS(PipelineData.WORDPRESS.id),
    ].sort(Execution.sort),
  );

  public list(): Promise<Execution[]> {
    return this.delegate.list();
  }

  public async query(q: { pipelineId: string }): Promise<Execution[]> {
    return this.delegate.storage.filter((e) => e.pipelineId === q.pipelineId).toSorted(Execution.sort);
  }

  public async queryMostRecentExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
    const result = new Map<string, Execution | null>();
    for (const pipelineId of q.pipelineIds) {
      const mostRecentExecution = this.delegate.storage.toSorted(Execution.sort).find((e) => e.pipelineId === pipelineId);
      result.set(pipelineId, mostRecentExecution || null);
    }
    return result;
  }

  public findById(id: string): Promise<Execution | undefined> {
    return this.delegate.findById(id);
  }

  public create(pipeline: Execution): Promise<Execution | undefined> {
    return this.delegate.create(pipeline);
  }

  public update(pipeline: Execution): Promise<Execution | undefined> {
    return this.delegate.update(pipeline);
  }

  public remove(id: string): Promise<Execution | undefined> {
    return this.delegate.remove(id);
  }
}
