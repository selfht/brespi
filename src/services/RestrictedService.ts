import { PipelineRepository } from "@/repositories/PipelineRepository";

export class RestrictedService {
  public constructor(private readonly pipelineRepository: PipelineRepository) {}

  public async deleteAllPipelines(): Promise<void> {
    await this.pipelineRepository.removeAll();
  }
}
