import { Pipeline } from "@/models/Pipeline";
import { GenericInMemoryRepository } from "./GenericInMemoryRepository";

export class PipelineRepository {
  protected readonly delegate = new GenericInMemoryRepository<Pipeline>();

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

  public removeAll(): Promise<void> {
    return this.delegate.removeAll();
  }
}
