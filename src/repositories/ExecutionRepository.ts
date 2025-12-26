import { Execution } from "@/models/Execution";

export interface ExecutionRepository {
  list(): Promise<Execution[]>;

  query(q: { pipelineId: string }): Promise<Execution[]>;

  queryMostRecentExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>>;

  findById(id: string): Promise<Execution | undefined>;

  create(pipeline: Execution): Promise<Execution | undefined>;

  update(pipeline: Execution): Promise<Execution | undefined>;

  remove(id: string): Promise<Execution | undefined>;
}
