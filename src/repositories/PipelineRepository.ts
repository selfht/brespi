import { PipelineData } from "@/__testdata__/PipelineData";
import { Pipeline } from "@/models/Pipeline";
import { InMemoryRepository } from "./InMemoryRepository";

export class PipelineRepository extends InMemoryRepository<Pipeline> {
  public constructor() {
    super([PipelineData.WORK_IN_PROGRESS, PipelineData.POSTGRES, PipelineData.WORDPRESS, PipelineData.RESTORE]);
  }
}
