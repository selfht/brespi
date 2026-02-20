import { Env } from "@/Env";
import { Mutex } from "@/helpers/Mutex";
import { Configuration } from "@/models/Configuration";

type ChangeTrigger = "application" | "disk_synchronization";
type ChangeListener = {
  event: "configuration_change" | "synchronization_change";
  callback: (data: { configuration: Configuration; trigger: ChangeTrigger }) => unknown;
};

export class ConfigurationRepository {
  private readonly mutex = new Mutex();
  private readonly diskFilePath: string;
  private readonly changeListeners: ChangeListener[] = [];

  private memoryObject?: Configuration.Core;
  private memoryObjectMatchesDiskFile = true; // by definition, this will initially be true

  public constructor(env: Env.Private) {
    this.diskFilePath = env.O_BRESPI_CONFIGURATION;
  }

  public async initializeFromDisk() {
    const { release } = await this.mutex.acquire();
    try {
      if (!this.memoryObject) {
        this.performUpdate({
          trigger: "disk_synchronization",
          memoryObject: await this.readDiskConfiguration(),
          memoryObjectMatchesDiskFile: true,
        });
      }
    } finally {
      release();
    }
  }

  public subscribe(event: ChangeListener["event"], callback: ChangeListener["callback"]) {
    this.changeListeners.push({ event, callback });
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

  public async write<T extends { configuration: Configuration.Core }>(fn: (configuration: Configuration) => T | Promise<T>): Promise<T> {
    const { release } = await this.mutex.acquire();
    try {
      const input = this.getCurrentValue();
      const output = await fn(input);
      const memoryObject = Configuration.Core.parse(output.configuration);
      const memoryObjectMatchesDiskFile = await this.compareMemoryObjectWithDiskFile(memoryObject);
      this.performUpdate({
        trigger: "application",
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
      throw new Error(`Please call \`${"initializeFromDisk" satisfies keyof typeof this}\` first`);
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
      throw new Error(`Please call \`${"initializeFromDisk" satisfies keyof typeof this}\` first`);
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
        trigger: "disk_synchronization",
        memoryObject,
        memoryObjectMatchesDiskFile: true,
      });
    } finally {
      release();
    }
  }

  private performUpdate({
    trigger,
    memoryObject,
    memoryObjectMatchesDiskFile,
  }: {
    trigger: ChangeTrigger;
    memoryObject: Configuration.Core;
    memoryObjectMatchesDiskFile: boolean;
  }) {
    const oldMemoryObject = this.memoryObject;
    const oldMemoryObjectMatchesDiskFile = this.memoryObjectMatchesDiskFile;

    // Always assign both fields in a single tick to keep `memoryObject` and `memoryObjectMatchesDiskFile` synchronized,
    // so the `read` method never sees an impossible state
    this.memoryObject = memoryObject;
    this.memoryObjectMatchesDiskFile = memoryObjectMatchesDiskFile;

    const configurationWasChanged = !Bun.deepEquals(this.memoryObject, oldMemoryObject);
    if (configurationWasChanged) {
      this.changeListeners
        .filter(({ event }) => event === "configuration_change") //
        .forEach(({ callback }) => callback({ configuration: this.getCurrentValue(), trigger }));
    }
    const synchronizationWasChanged = this.memoryObjectMatchesDiskFile !== oldMemoryObjectMatchesDiskFile;
    if (synchronizationWasChanged) {
      this.changeListeners
        .filter(({ event }) => event === "synchronization_change") //
        .forEach(({ callback }) => callback({ configuration: this.getCurrentValue(), trigger }));
    }
    console.debug("🫆 Broadcasted configuration change", {
      trigger,
      configurationWasChanged,
      synchronizationWasChanged,
    });
  }
}
