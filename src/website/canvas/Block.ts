export type Block = {
  id: string;
  incomingId?: string;
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

  export type PrimitiveField = string | number | boolean | null;
  export type CustomField = {
    custom: "empty_array";
  };
  export type Details = Record<string, PrimitiveField | undefined | Array<PrimitiveField | undefined> | CustomField>;
}
