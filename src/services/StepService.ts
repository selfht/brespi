import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Step } from "@/models/Step";

export class StepService {
  public validate(unknown: unknown): void {
    const step = Step.parse.SCHEMA.catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    }).parse(unknown);

    console.log("TODO: actually validate the step (field lengths, etc.)");
  }
}
