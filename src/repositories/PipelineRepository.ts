import { Pipeline } from "@/models/Pipeline";

export interface PipelineRepository {
  list(): Promise<Pipeline[]>;

  findById(id: string): Promise<Pipeline | undefined>;

  create(pipeline: Pipeline): Promise<Pipeline | undefined>;

  update(pipeline: Pipeline): Promise<Pipeline | undefined>;

  remove(id: string): Promise<Pipeline | undefined>;
}
