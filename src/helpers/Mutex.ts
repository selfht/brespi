type Release = () => void;

export class Mutex {
  private locked = false;
  private queue = [] as (() => void)[];

  public async acquire(): Promise<Release> {
    const release: Release = () => {
      const next = this.queue.shift();
      if (next) {
        next();
      } else {
        this.locked = false;
      }
    };
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(release);
      } else {
        this.queue.push(() => {
          this.locked = true;
          resolve(release);
        });
      }
    });
  }
}
