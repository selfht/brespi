import { ProblemDetails } from "@/models/ProblemDetails";
import { Class } from "@/types/Class";
import { Json } from "@/types/Json";

export class Exception<D extends Record<string, Json> = Record<string, Json>> extends Error {
  public static readonly NAMESPACE = "@brespi/Exception";

  public static initializeFields(klass: Class & { _NAME_: string }) {
    const group = klass._NAME_;
    for (const key of Object.keys(klass).filter((key) => key !== ("_NAME_" satisfies keyof typeof klass))) {
      const problem = `${group}::${key}`;
      const exceptionFn = (details?: Record<string, Json>) => new Exception(problem, details);
      exceptionFn.matches = (otherProblem: unknown) => {
        if (typeof otherProblem === "string") {
          return otherProblem === problem;
        }
        if (ProblemDetails.isInstance(otherProblem)) {
          return otherProblem.problem === problem;
        }
        return false;
      };
      Object.assign(klass, {
        [key]: exceptionFn satisfies Exception.Fn,
      });
    }
  }

  public readonly namespace = Exception.NAMESPACE;

  public constructor(
    public readonly problem: string,
    public readonly details?: D,
  ) {
    super(problem);
  }

  public json(): ProblemDetails {
    return {
      problem: this.problem,
      details: this.details,
    };
  }
}

export namespace Exception {
  type WithMatcher<T> = T & { matches(otherProblem: unknown): boolean };
  export type Fn<T extends Record<string, Json> | void = void> = T extends void
    ? WithMatcher<(details?: Record<string, Json>) => Exception>
    : WithMatcher<(details: T) => Exception>;

  export function isInstance<D extends Record<string, Json>>(e: any, specific: Exception.Fn<D>): e is Exception<D>;
  export function isInstance(e: any): e is Exception;
  export function isInstance<D extends Record<string, Json> = Record<string, Json>>(e: any, specific?: Exception.Fn<D>): boolean {
    const marker = "namespace" satisfies keyof InstanceType<typeof Exception>;
    const isException = marker in e && e[marker] === Exception.NAMESPACE;
    if (!isException) {
      return false;
    }
    if (specific) {
      const { problem } = specific({});
      return problem === (e as Exception).problem;
    }
    return true;
  }
}
