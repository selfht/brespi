import z, { ZodError } from "zod/v4";

type MustMatch<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? X : never) : never;

type ParserFactory<T, U> =
  MustMatch<T, U> extends never
    ? never
    : {
        ensureTypeEquivalence: () => {
          (json: unknown): T;
          SCHEMA: z.ZodType<T>;
        };
      };

export namespace Parser {
  export function forType<T>() {
    return {
      withSchema<U extends z.ZodType<T>>(schema: U): ParserFactory<T, z.infer<U>> {
        function parseFn(json: unknown): T {
          try {
            return schema.parse(json);
          } catch (e: any) {
            if (e.name === ZodError.name) {
              const { issues } = e as ZodError;
              throw new Error(`JSON did not match Zod schema; ${JSON.stringify(issues, null, 2)}`);
            }
            throw e;
          }
        }
        parseFn.SCHEMA = schema;
        // @ts-ignore
        return {
          ensureTypeEquivalence() {
            return parseFn;
          },
        };
      },
    };
  }
}
