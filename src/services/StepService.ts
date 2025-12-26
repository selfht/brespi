import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Step } from "@/models/Step";

export class StepService {
  public validate(unknown: unknown): void {
    Step.parse.SCHEMA.catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    }).parse(unknown);
  }
}
