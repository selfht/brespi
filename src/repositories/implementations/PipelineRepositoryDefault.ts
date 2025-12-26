import { PipelineData } from "@/__testdata__/PipelineData";
import { Pipeline } from "@/models/Pipeline";
import { GenericInMemoryRepository } from "./GenericInMemoryRepository";
import { PipelineRepository } from "../PipelineRepository";

export class PipelineRepositoryDefault implements PipelineRepository {
  private readonly delegate = new GenericInMemoryRepository<Pipeline>([
    PipelineData.WORK_IN_PROGRESS,
    PipelineData.POSTGRES,
    PipelineData.WORDPRESS,
    PipelineData.RESTORE,
  ]);

  public list(): Promise<Pipeline[]> {
    return this.delegate.list();
  }

  public findById(id: string): Promise<Pipeline | undefined> {
    return this.delegate.findById(id);
  }

  public create(pipeline: Pipeline): Promise<Pipeline | undefined> {
    return this.delegate.create(pipeline);
  }

  public update(pipeline: Pipeline): Promise<Pipeline | undefined> {
    return this.delegate.update(pipeline);
  }

  public remove(id: string): Promise<Pipeline | undefined> {
    return this.delegate.remove(id);
  }
}
