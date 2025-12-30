type GlobalMutexOptions = {
  key: string[];
};
type MutexOptions = {
  onUnlock?: () => unknown;
};
type Acquisition = {
  release: () => void;
};

export class Mutex {
  private static readonly REGISTRY: Record<string, Mutex> = {};

  public static acquireFromRegistry({ key }: GlobalMutexOptions): Promise<Acquisition> {
    const combinedKey = key.join(";");
    if (!this.REGISTRY[combinedKey]) {
      this.REGISTRY[combinedKey] = new Mutex({
        onUnlock: () => {
          delete this.REGISTRY[combinedKey]; // self destruct
        },
      });
    }
    return this.REGISTRY[combinedKey].acquire();
  }

  private locked = false;
  private queue = [] as (() => void)[];

  public constructor(private readonly options = {} as MutexOptions) {}

  public async acquire(): Promise<Acquisition> {
    const release = () => {
      const next = this.queue.shift();
      if (next) {
        next();
      } else {
        this.locked = false;
        this.options.onUnlock?.();
      }
    };
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve({ release });
      } else {
        this.queue.push(() => {
          this.locked = true;
          resolve({ release });
        });
      }
    });
  }
}
