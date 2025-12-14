import { PipelineData } from "@/__testdata__/PipelineData";
import { Pipeline } from "@/models/Pipeline";

export class PipelineRepository {
  private readonly REPOSITORY: Pipeline[] = [
    PipelineData.POSTGRES_BACKUP,
    PipelineData.WORK_IN_PROGRESS,
    PipelineData.WORDPRESS_BACKUP,
    PipelineData.RESTORE,
  ];

  public async query(): Promise<Pipeline[]> {
    return this.REPOSITORY;
  }

  public async find(id: string): Promise<Pipeline | undefined> {
    return this.REPOSITORY.find((p) => p.id === id);
  }

  public async create(pipeline: Pipeline): Promise<Pipeline | undefined> {
    if (this.REPOSITORY.some((p) => p.id === pipeline.id)) {
      return undefined;
    }
    this.REPOSITORY.push(pipeline);
    return pipeline;
  }

  public async update(pipeline: Pipeline): Promise<Pipeline | undefined> {
    const existingIndex = this.REPOSITORY.findIndex((p) => p.id === pipeline.id);
    if (existingIndex) {
      this.REPOSITORY.splice(existingIndex, 1, pipeline);
      return pipeline;
    }
    return undefined;
  }

  public async remove(id: string): Promise<Pipeline | undefined> {
    const existingIndex = this.REPOSITORY.findIndex((p) => p.id === id);
    if (existingIndex) {
      const [pipeline] = this.REPOSITORY.splice(existingIndex, 1);
      return pipeline;
    }
    return undefined;
  }
}
