import { ProblemDetails } from "@/models/ProblemDetails";
import { Class } from "@/types/Class";
import { Json } from "@/types/Json";

export class Exception extends Error {
  public static readonly ID = "@brespi/Exception";

  public static initializeFields(klass: Exception.ErrorClass) {
    const group = klass[Exception.NS];
    for (const key of Object.keys(klass)) {
      if (key !== Exception.NS) {
        Object.assign(klass, {
          [key]: ((details?: Record<string, Json>) => new Exception(`${group}::${key}`, details)) satisfies Exception.Fn,
        });
      }
    }
  }

  public readonly id = Exception.ID;

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
  export const NS = "NS" as const;
  export type Fn = (details?: Record<string, Json>) => Exception;
  export type ErrorClass = Class & { [NS]: string };

  export function isInstance(e: any): e is Exception {
    return "id" in e && e.id === Exception.ID;
  }
}
