export type Block = {
  id: string;
  incomingId: string | null;
  theme: "default" | "success" | "error" | "busy" | "unused";
  label: string;
  details: Block.Details | null;
  handles: Block.Handle[];
  selected: boolean;
};

export namespace Block {
  export enum Handle {
    input = "input",
    output = "output",
  }
  export type Details = Record<string, string | number | boolean | null | undefined | Array<string | number | boolean | null | undefined>>;
}
