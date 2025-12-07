export type Block = {
  id: string;
  incomingId: string | null;
  label: string;
  details: Record<string, string | number | boolean | null | undefined | Array<string | number | boolean | null | undefined>>;
  handles: Block.Handle[];
  selected: boolean;
};

export namespace Block {
  export enum Handle {
    input = "input",
    output = "output",
  }
}
