export type Block = {
  id: string;
  incomingId?: string;
  label: string;
  details: Record<string, string | number | boolean | undefined | Array<string | number | boolean | undefined>>;
  handles: Block.Handle[];
  selected: boolean;
};

export namespace Block {
  export enum Handle {
    input = "input",
    output = "output",
  }
}
