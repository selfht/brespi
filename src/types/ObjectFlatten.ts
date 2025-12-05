type Primitive = string | number | boolean | undefined;

type FlattenKeys<T, Prefix extends string = ""> = T extends Primitive
  ? Prefix
  : {
      [K in keyof T]-?: K extends string
        ? T[K] extends Primitive
          ? `${Prefix}${K}`
          : FlattenKeys<T[K], `${Prefix}${K}.`>
        : never;
    }[keyof T];

type FlattenValue<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? FlattenValue<T[Key], Rest>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;

type IsOptional<T, K extends keyof T> = undefined extends T[K] ? true : false;

type FlattenOptionalKeys<T, Prefix extends string = ""> = T extends Primitive
  ? never
  : {
      [K in keyof T]-?: K extends string
        ? IsOptional<T, K> extends true
          ? `${Prefix}${K}` | (T[K] extends Primitive ? never : FlattenOptionalKeys<T[K], `${Prefix}${K}.`>)
          : T[K] extends Primitive
            ? never
            : FlattenOptionalKeys<T[K], `${Prefix}${K}.`>
        : never;
    }[keyof T];

/**
 * Flattens an object to a single record, where nested keys are represented via dot-notation
 */
export type ObjectFlatten<T> = T extends any
  ? {
      [K in FlattenKeys<T> as K extends FlattenOptionalKeys<T> ? never : K]: FlattenValue<T, K>;
    } & {
      [K in FlattenKeys<T> as K extends FlattenOptionalKeys<T> ? K : never]?: FlattenValue<T, K>;
    }
  : never;

export namespace ObjectFlatten {
  export function perform<T extends Record<string, any>>(obj: T): ObjectFlatten<T> {
    const result: Record<string, any> = {};
    performInternally(obj, "", result);
    return result as unknown as ObjectFlatten<T>;
  }

  /**
   * Internal helper function for recursion - not bound to generic types
   */
  function performInternally(obj: Record<string, any>, prefix: string, result: Record<string, any>): void {
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        performInternally(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }
  }
}
