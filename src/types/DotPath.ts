export type DotPath<T> = T extends readonly any[]
  ? never
  : T extends object
    ? { [K in keyof T & string]: K | `${K}.${DotPath<T[K]>}` }[keyof T & string]
    : never;
