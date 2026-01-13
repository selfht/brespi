import { ProblemDetails } from "@/models/ProblemDetails";
import { Class } from "@/types/Class";
import { Json } from "@/types/Json";

export class Exception extends Error {
  public static readonly NAMESPACE = "@brespi/Exception";

  public static initializeFields(klass: Class) {
    const group = klass.name;
    for (const key of Object.keys(klass)) {
      Object.assign(klass, {
        [key]: ((details?: Record<string, Json>) => new Exception(`${group}::${key}`, details)) satisfies Exception.Fn,
      });
    }
  }

  public readonly namespace = Exception.NAMESPACE;

  public constructor(
    public readonly problem: string,
    public readonly details?: Record<string, Json>,
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
  export type Fn<T extends Record<string, Json> | void = void> = T extends void
    ? (details?: Record<string, Json>) => Exception
    : (details: T) => Exception;

  export function isInstance(e: any): e is Exception {
    return "namespace" in e && e.namespace === Exception.NAMESPACE;
  }
}
