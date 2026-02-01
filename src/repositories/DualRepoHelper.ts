type Options<F, C, M> = {
  combineFn: (core: C, meta: M) => F;
  standardMetaFn: (opts: { id: string }) => M;
  listMetasFn: () => Promise<M[]>;
  queryMetasFn: (opts: { ids: string[] }) => Promise<M[]>;
  insertMetasFn: (metas: M[]) => Promise<unknown>;
  deleteMetasFn(opts: { ids: string[] }): Promise<unknown>;
};

export class DualRepoHelper<F, C extends { id: string }, M extends { id: string }> {
  public constructor(private readonly options: Options<F, C, M>) {}

  public async deleteMetadata(id: string): Promise<void> {
    await this.options.deleteMetasFn({ ids: [id] });
  }

  public async joinMetadata(schedule: C): Promise<F>;
  public async joinMetadata(schedules: C[]): Promise<F[]>;
  public async joinMetadata(singleOrPlural: C | C[]): Promise<F | F[]> {
    const cores: C[] = Array.isArray(singleOrPlural) ? singleOrPlural : [singleOrPlural];
    const metadatas = await this.options.queryMetasFn({
      ids: cores.map(({ id }) => id),
    });
    // START intermezzo: check if we're missing metadata information for schedules (this is possible)
    const coreSchedulesWithoutMetadata = cores.filter((cs) => !metadatas.some((m) => cs.id === m.id));
    const missingMetadatas = await this.insertMissingMetadatas(coreSchedulesWithoutMetadata);
    metadatas.push(...missingMetadatas);
    // END intermezzo
    const result = this.combine(cores, metadatas);
    return Array.isArray(singleOrPlural) ? result : result[0];
  }

  public async synchronizeWithUpdatedConfiguration(cores: C[]): Promise<F[]> {
    // 0. Get the available metadata
    let metadatas = await this.options.listMetasFn();
    // 1. Insert missing metadatas
    const schedulesWithMissingMetadata = cores.filter((cs) => !metadatas.some((m) => cs.id === m.id));
    const missingMetadatas = await this.insertMissingMetadatas(schedulesWithMissingMetadata);
    metadatas = [...metadatas, ...missingMetadatas];
    // 2. Delete superfluous metadatas
    const superfluousMetadatas = metadatas.filter((m) => !cores.some((cs) => m.id === cs.id)).map(({ id }) => id);
    await this.options.deleteMetasFn({ ids: superfluousMetadatas });
    metadatas = metadatas.filter((m) => !superfluousMetadatas.includes(m.id));
    // 3. Return the latest state
    return this.combine(cores, metadatas);
  }

  public combine(cores: C[], metadatas: M[]): Array<F> {
    return cores.map<F>((core) => {
      const meta = metadatas.find((m) => m.id === core.id);
      if (!meta) {
        throw new Error(`Missing metadata; id=${core.id}`);
      }
      return this.options.combineFn(core, meta);
    });
  }

  public async insertMissingMetadatas(coresWithoutMeta: C[]): Promise<M[]> {
    const missingMetas = coresWithoutMeta.map(({ id }) => this.options.standardMetaFn({ id }));
    if (missingMetas.length > 0) {
      await this.options.insertMetasFn(missingMetas);
    }
    return missingMetas;
  }
}
