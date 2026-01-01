import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Configuration } from "@/models/Configuration";
import { config } from "zod";

export class ConfigurationRepository {
  private readonly mutex = new Mutex();

  private readonly storage:
    | { mode: "in_memory" } //
    | { mode: "on_disk"; diskFile: Bun.BunFile };

  private memoryObject?: Configuration;
  private memorySynchronisedWithDisk = true;

  public constructor(env: Env.Private) {
    if (env.X_BRESPI_CONFIGURATION === ":memory:") {
      this.storage = {
        mode: "in_memory",
      };
    } else {
      this.storage = {
        mode: "on_disk",
        diskFile: Bun.file(env.X_BRESPI_CONFIGURATION),
      };
    }
  }

  public async read<T = void>(fn: (configuration: Configuration) => T | Promise<T>): Promise<T> {
    const { release } = await this.mutex.acquire();
    try {
      const configuration = await this.getCurrentValueOrInitialize();
      return await fn(configuration);
    } finally {
      release();
    }
  }

  public async write<T extends { configuration: Configuration }>(fn: (configuration: Configuration) => T | Promise<T>): Promise<T> {
    const { release } = await this.mutex.acquire();
    try {
      const configuration = await this.getCurrentValueOrInitialize();
      const output = await fn(configuration);
      this.memoryObject = output.configuration;
      this.memorySynchronisedWithDisk = await this.matchesDiskConfiguration(this.memoryObject);
      return output;
    } finally {
      release();
    }
  }

  private async getCurrentValueOrInitialize(): Promise<Configuration> {
    if (!this.memoryObject) {
      if (this.storage.mode === "in_memory") {
        this.memoryObject = Configuration.empty();
      } else {
        this.memoryObject = await this.readDiskConfiguration(this.storage);
      }
    }
    return this.memoryObject;
  }

  private async matchesDiskConfiguration(inMemory: Configuration): Promise<boolean> {
    if (this.storage.mode === "on_disk") {
      const onDisk = await this.readDiskConfiguration(this.storage);
      return Bun.deepEquals(inMemory, onDisk);
    }
    return true;
  }

  /**
   * We never implicitly write to disk; a missing file gets interpreted as empty configuration
   */
  private async readDiskConfiguration({ diskFile }: Extract<typeof this.storage, { mode: "on_disk" }>) {
    if (await diskFile.exists()) {
      const json = await diskFile.json();
      return Configuration.parse(json);
    }
    return Configuration.empty();
  }
}
