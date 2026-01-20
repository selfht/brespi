import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Configuration } from "@/models/Configuration";

type SynchronizationChangeListener = (conf: Configuration) => unknown;

export class ConfigurationRepository {
  private readonly mutex = new Mutex();

  private readonly storage:
    | { mode: "in_memory" } //
    | { mode: "on_disk"; diskFile: Bun.BunFile };

  private memoryObject?: Configuration.Core;
  private memoryObjectMatchesDiskFile: boolean = true; // by definition, this will initially be true

  private readonly synchronizationChangeListeners: SynchronizationChangeListener[] = [];

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

  public async initialize() {
    const { release } = await this.mutex.acquire();
    try {
      if (!this.memoryObject) {
        if (this.storage.mode === "in_memory") {
          this.memoryObject = Configuration.Core.empty();
        } else {
          this.memoryObject = await this.readDiskConfiguration(this.storage);
        }
      }
    } finally {
      release();
    }
  }

  public subscribe(_event: "synchronization_change", listener: SynchronizationChangeListener) {
    this.synchronizationChangeListeners.push(listener);
  }

  public async read<T = void>(): Promise<Configuration>;
  public async read<T = void>(fn: (configuration: Configuration) => T | Promise<T>): Promise<T>;
  public async read<T = void>(fn?: (configuration: Configuration) => T | Promise<T>): Promise<T> {
    const configuration = await this.getCurrentValue();
    if (fn) {
      return await fn(configuration);
    }
    return configuration as T;
  }

  // TODO: rollback in `finally` if there's an error? make this method atomic?
  public async write<T extends { configuration: Configuration.Core }>(fn: (configuration: Configuration) => T | Promise<T>): Promise<T> {
    const { release } = await this.mutex.acquire();
    try {
      const input = await this.getCurrentValue();
      const output = await fn(input);
      const oldMemoryObjectMatchesDiskFile = this.memoryObjectMatchesDiskFile;

      const memoryObject = Configuration.Core.parse(output.configuration);
      const memoryObjectMatchesDiskFile = await this.compareMemoryObjectWithDiskFile(memoryObject);

      // Assign both fields in a single tick to keep `memoryObject` and `memoryObjectMatchesDiskFile` synchronized,
      // so the `read` method never sees an impossible state
      this.memoryObject = memoryObject;
      this.memoryObjectMatchesDiskFile = memoryObjectMatchesDiskFile;

      if (oldMemoryObjectMatchesDiskFile !== this.memoryObjectMatchesDiskFile) {
        const latestConfiguration: Configuration = {
          ...this.memoryObject,
          synchronized: this.memoryObjectMatchesDiskFile,
        };
        this.synchronizationChangeListeners.forEach((listener) => listener(latestConfiguration));
      }

      return output;
    } finally {
      release();
    }
  }

  private async getCurrentValue(): Promise<Configuration> {
    if (!this.memoryObject) {
      throw new Error(`Please call \`${"initialize" satisfies keyof typeof this}\` on the configuration repository`);
    }
    return {
      ...this.memoryObject,
      synchronized: this.memoryObjectMatchesDiskFile,
    };
  }

  private async compareMemoryObjectWithDiskFile(inMemory: Configuration.Core): Promise<boolean> {
    if (this.storage.mode === "on_disk") {
      const onDiskValue = await this.readDiskConfiguration(this.storage);
      return Bun.deepEquals(inMemory, onDiskValue);
    }
    return true;
  }

  /**
   * We never implicitly write to disk; a missing file gets interpreted as empty configuration
   */
  private async readDiskConfiguration({ diskFile }: Extract<typeof this.storage, { mode: "on_disk" }>) {
    if (await diskFile.exists()) {
      const json = await diskFile.json();
      return Configuration.Core.parse(json);
    }
    return Configuration.Core.empty();
  }
}
