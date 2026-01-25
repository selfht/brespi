import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Configuration } from "@/models/Configuration";

type SynchronizationChangeListener = (conf: Configuration) => unknown;

export class ConfigurationRepository {
  private readonly mutex = new Mutex();
  private readonly diskFilePath: string;
  private readonly synchronizationChangeListeners: SynchronizationChangeListener[] = [];

  private memoryObject?: Configuration.Core;
  private memoryObjectMatchesDiskFile: boolean = true; // by definition, this will initially be true

  public constructor(env: Env.Private) {
    this.diskFilePath = env.O_BRESPI_CONFIGURATION;
  }

  public async initialize() {
    const { release } = await this.mutex.acquire();
    try {
      if (!this.memoryObject) {
        this.memoryObject = await this.readDiskConfiguration();
        this.memoryObjectMatchesDiskFile = true;
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
    const configuration = this.getCurrentValue();
    if (fn) {
      return await fn(configuration);
    }
    return configuration as T;
  }

  // TODO: rollback in `finally` if there's an error? make this method atomic?
  public async write<T extends { configuration: Configuration.Core }>(fn: (configuration: Configuration) => T | Promise<T>): Promise<T> {
    const { release } = await this.mutex.acquire();
    try {
      const input = this.getCurrentValue();
      const output = await fn(input);
      const memoryObject = Configuration.Core.parse(output.configuration);
      const memoryObjectMatchesDiskFile = await this.compareMemoryObjectWithDiskFile(memoryObject);
      this.performUpdate({
        memoryObject,
        memoryObjectMatchesDiskFile,
      });
      return output;
    } finally {
      release();
    }
  }

  public async saveChanges(): Promise<Configuration> {
    await this.synchronizeDiskConfiguration("save");
    return this.getCurrentValue();
  }

  public async discardChanges(): Promise<Configuration> {
    await this.synchronizeDiskConfiguration("discard");
    return this.getCurrentValue();
  }

  private getCurrentValue(): Configuration {
    if (!this.memoryObject) {
      throw new Error(`Please call \`${"initialize" satisfies keyof typeof this}\` on the configuration repository`);
    }
    return {
      ...this.memoryObject,
      synchronized: this.memoryObjectMatchesDiskFile,
    };
  }

  private async compareMemoryObjectWithDiskFile(inMemory: Configuration.Core): Promise<boolean> {
    const diskValue = await this.readDiskConfiguration();
    return Bun.deepEquals(inMemory, diskValue);
  }

  /**
   * A missing config.json is interpreted as empty configuration
   */
  private async readDiskConfiguration() {
    const diskFile = Bun.file(this.diskFilePath);
    if (await diskFile.exists()) {
      const json = await diskFile.json();
      return Configuration.Core.parse(json);
    }
    return Configuration.Core.empty();
  }

  /**
   * Synchronizes the "in memory" object with the "on disk" configuration
   */
  private async synchronizeDiskConfiguration(operation: "save" | "discard") {
    if (!this.memoryObject) {
      throw new Error(`Please call \`${"initialize" satisfies keyof typeof this}\` on the configuration repository`);
    }
    const { release } = await this.mutex.acquire();
    try {
      let memoryObject: Configuration.Core;
      const diskFile = Bun.file(this.diskFilePath);
      if (operation === "save") {
        await diskFile.write(JSON.stringify(this.memoryObject));
        memoryObject = this.memoryObject;
      } else if (operation === "discard") {
        memoryObject = await this.readDiskConfiguration();
      } else {
        throw new Error(`Unknown operation: ${operation}`);
      }
      this.performUpdate({
        memoryObject,
        memoryObjectMatchesDiskFile: true,
      });
    } finally {
      release();
    }
  }

  private performUpdate({
    memoryObject,
    memoryObjectMatchesDiskFile,
  }: {
    memoryObject: Configuration.Core;
    memoryObjectMatchesDiskFile: boolean;
  }) {
    const oldMemoryObjectMatchesDiskFile = this.memoryObjectMatchesDiskFile;

    // Always assign both fields in a single tick to keep `memoryObject` and `memoryObjectMatchesDiskFile` synchronized,
    // so the `read` method never sees an impossible state
    this.memoryObject = memoryObject;
    this.memoryObjectMatchesDiskFile = memoryObjectMatchesDiskFile;

    if (this.memoryObjectMatchesDiskFile !== oldMemoryObjectMatchesDiskFile) {
      const latestConfiguration: Configuration = {
        ...this.memoryObject,
        synchronized: this.memoryObjectMatchesDiskFile,
      };
      this.synchronizationChangeListeners.forEach((listener) => listener(latestConfiguration));
    }
  }
}
