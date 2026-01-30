export class HybridHelper<C extends { id: string }, M extends { id: string }> {
  public constructor(
    private readonly standardMetaFn: (id: string) => M,
    private readonly insertMetasFn: (metas: M[]) => Promise<unknown>,
  ) {}

  public async insertMissingMetadatas(coresWithoutMeta: C[]): Promise<M[]> {
    const missingMetas = coresWithoutMeta.map(({ id }) => this.standardMetaFn(id));
    if (missingMetas.length > 0) {
      await this.insertMetasFn(missingMetas);
    }
    return missingMetas;
  }

  public combine(cores: C[], metadatas: M[]): Array<M & C> {
    return cores.map<C & M>((core) => {
      const meta = metadatas.find((m) => m.id === core.id);
      if (!meta) {
        throw new Error(`Missing metadata; id=${core.id}`);
      }
      return {
        ...core,
        ...meta,
      };
    });
  }
}
