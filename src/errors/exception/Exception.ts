import { ProblemDetails } from "@/models/ProblemDetails";
import { Class } from "@/types/Class";
import { Json } from "@/types/Json";

export class Exception extends Error {
  public static initializeFields(klass: Exception.ClassWithGroup) {
    const group = klass[Exception.Group];
    for (const key of Object.keys(klass)) {
      if (key !== Exception.Group) {
        Object.assign(klass, {
          [key]: ((details?: Record<string, Json>) => new Exception(`${group}::${key}`, details)) satisfies Exception.Fn,
        });
      }
    }
  }

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
  export const Group = "GROUP" as const;
  export type Fn = (details?: Record<string, Json>) => Exception;
  export type ClassWithGroup = Class & { [Group]: string };
}
