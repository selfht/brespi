import * as schema from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { Configuration } from "@/models/Configuration";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";
import { isTable } from "drizzle-orm";

export class RestrictedService {
  public constructor(
    private readonly sqlite: Sqlite,
    private readonly configurationRepository: ConfigurationRepository,
  ) {}

  public async deleteEverything(): Promise<void> {
    for (const table of Object.values(schema)) {
      if (isTable(table)) {
        await this.sqlite.delete(table);
      }
    }
    await this.configurationRepository.write((_) => ({
      configuration: Configuration.Core.empty(),
    }));
  }
}
