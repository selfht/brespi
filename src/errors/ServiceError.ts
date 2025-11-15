import { ServiceErrorTypes } from "@/types/ServiceErrorTypes";
import { ProblemDetails } from "@/models/ProblemDetails";

export class ServiceError extends Error {
  public readonly name = ServiceError.name;

  public constructor(
    public readonly problem: string,
    public readonly details?: Record<string, any>,
  ) {
    super(problem);
  }

  public static createGroup<T extends readonly string[]>(name: string, subProblems: T): ServiceErrorTypes.Group<T> {
    const group = { name } as any;
    for (const subProblem of subProblems) {
      const problem = `${name}::${subProblem}`;

      function errorLambda(details?: Record<string, any>): ServiceError {
        return new ServiceError(problem, details);
      }

      errorLambda.matches = (problemOrProblemWithDetails?: string | ProblemDetails): boolean => {
        if (typeof problemOrProblemWithDetails === "string") {
          return problem === problemOrProblemWithDetails;
        }
        if (typeof problemOrProblemWithDetails?.problem === "string") {
          return problem === problemOrProblemWithDetails.problem;
        }
        return false;
      };
      group[subProblem] = errorLambda satisfies ServiceErrorTypes.ErrorLambda;
    }
    return group;
  }

  public json(): ProblemDetails {
    return {
      problem: this.problem,
      details: this.details,
    };
  }
}
