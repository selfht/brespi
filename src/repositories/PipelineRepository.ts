import { PipelineError } from "@/errors/PipelineError";
import { Pipeline } from "@/models/Pipeline";
import { ConfigurationRepository } from "./ConfigurationRepository";

export class PipelineRepository {
  public constructor(private readonly configuration: ConfigurationRepository) {}

  public async query(): Promise<Pipeline[]> {
    const { pipelines } = await this.configuration.read();
    return pipelines.sort(Pipeline.sortNewToOld);
  }

  public findById(id: string): Promise<Pipeline | undefined> {
    return this.configuration.read(({ pipelines }) => pipelines.find((p) => p.id === id));
  }

  public async create(pipeline: Pipeline): Promise<Pipeline> {
    const { result } = await this.configuration.write((configuration) => {
      if (configuration.pipelines.some((p) => p.id === pipeline.id)) {
        throw PipelineError.already_exists({ id: pipeline.id });
      }
      return {
        result: pipeline,
        configuration: {
          ...configuration,
          pipelines: [pipeline, ...configuration.pipelines],
        },
      };
    });
    return result;
  }

  public async update(pipeline: Pipeline): Promise<Pipeline> {
    const { result } = await this.configuration.write((configuration) => {
      if (!configuration.pipelines.some((p) => p.id === pipeline.id)) {
        throw PipelineError.not_found({ id: pipeline.id });
      }
      return {
        result: pipeline,
        configuration: {
          ...configuration,
          pipelines: configuration.pipelines.map((p) => {
            if (p.id === pipeline.id) {
              return pipeline;
            }
            return p;
          }),
        },
      };
    });
    return result;
  }

  public async delete(id: string): Promise<Pipeline> {
    const { result } = await this.configuration.write((configuration) => {
      const existing = configuration.pipelines.find((p) => p.id === id);
      if (!existing) {
        throw PipelineError.not_found({ id });
      }
      return {
        result: existing,
        configuration: {
          ...configuration,
          pipelines: configuration.pipelines.filter((p) => p.id !== id),
        },
      };
    });
    return result;
  }
}
