import { ProblemDetails } from "@/models/ProblemDetails";
import { Class } from "@/types/Class";
import { Json } from "@/types/Json";

export class Exception extends Error {
  public static for(klass: Exception.ClassWithGroup, problem: string) {
    const group = klass[Exception.Group];
    return (details?: Record<string, Json>) => new Exception(`${group}::${problem}`, details);
  }

  public static initialize(klass: Exception.ClassWithGroup) {
    const group = klass[Exception.Group];
    for (const key of Object.keys(klass)) {
      if (key !== Exception.Group) {
        Object.assign(klass, {
          [key]: (details?: Record<string, Json>) => new Exception(`${group}::${key}`, details),
        });
      }
    }
  }

  public readonly name = Exception.name;

  public constructor(
    public readonly problem: string,
    public readonly details?: Record<string, any>,
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
  export type ClassWithGroup = Class & { [Group]: string };
}
