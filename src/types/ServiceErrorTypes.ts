import { ServiceError } from "@/errors/ServiceError";
import { ProblemDetails } from "@/models/ProblemDetails";

export namespace ServiceErrorTypes {
  export type ErrorLambda = ((details?: Record<string, any>) => ServiceError) & {
    matches: (problemOrProblemWithDetails?: string | ProblemDetails) => boolean;
  };

  export type ExtractStringArrayLiterals<T> = T extends ReadonlyArray<infer U> ? U : never;

  export type Group<T extends readonly string[]> = {
    name: string;
  } & Omit<
    {
      [K in ExtractStringArrayLiterals<T>]: ErrorLambda;
    },
    "name"
  >;
}
