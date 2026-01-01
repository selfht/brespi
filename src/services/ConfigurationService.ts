import { Configuration } from "@/models/Configuration";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";

export class ConfigurationService {
  public constructor(private readonly repository: ConfigurationRepository) {}

  public get(): Promise<Configuration> {
    return this.repository.read((config) => config);
  }
}
