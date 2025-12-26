export class GenericInMemoryRepository<T extends { id: string }> {
  public constructor(public readonly storage: T[] = []) {}

  public async list(): Promise<T[]> {
    return this.storage;
  }

  public async findById(id: string): Promise<T | undefined> {
    return this.storage.find((o) => o.id === id);
  }

  public async create(object: T): Promise<T | undefined> {
    if (this.storage.some((o) => o.id === object.id)) {
      return undefined;
    }
    this.storage.push(object);
    return object;
  }

  public async update(object: T): Promise<T | undefined> {
    const existingIndex = this.storage.findIndex((o) => o.id === object.id);
    if (existingIndex < 0) {
      return undefined;
    }
    this.storage.splice(existingIndex, 1, object);
    return object;
  }

  public async remove(id: string): Promise<T | undefined> {
    const existingIndex = this.storage.findIndex((o) => o.id === id);
    if (existingIndex < 0) {
      return undefined;
    }
    const [pipeline] = this.storage.splice(existingIndex, 1);
    return pipeline;
  }
}
