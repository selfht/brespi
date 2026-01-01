import { Pipeline } from "@/models/Pipeline";
import { ConfigurationRepository } from "./ConfigurationRepository";

export class PipelineRepository {
  public constructor(private readonly configuration: ConfigurationRepository) {}

  public list(): Promise<Pipeline[]> {
    return this.configuration.read(({ pipelines }) => pipelines);
  }

  public findById(id: string): Promise<Pipeline | undefined> {
    return this.configuration.read(({ pipelines }) => pipelines.find((p) => p.id === id));
  }

  public async create(pipeline: Pipeline): Promise<Pipeline | undefined> {
    const { result } = await this.configuration.write((configuration) => {
      const existing = configuration.pipelines.find((p) => p.id === pipeline.id);
      if (existing) {
        return {
          result: existing,
          configuration,
        };
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

  public async update(pipeline: Pipeline): Promise<Pipeline | undefined> {
    const { result } = await this.configuration.write((configuration) => {
      const existing = configuration.pipelines.find((p) => p.id === pipeline.id);
      if (!existing) {
        return {
          result: undefined,
          configuration,
        };
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

  public async remove(id: string): Promise<Pipeline | undefined> {
    const { result } = await this.configuration.write((configuration) => {
      const existing = configuration.pipelines.find((p) => p.id === id);
      if (!existing) {
        return {
          result: undefined,
          configuration,
        };
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

  public async removeAll(): Promise<void> {
    await this.configuration.write((configuration) => ({
      configuration: {
        ...configuration,
        pipelines: [],
      },
    }));
  }
}
