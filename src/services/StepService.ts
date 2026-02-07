import { PropertyExtractor } from "@/capabilities/propertyresolution/PropertyExtractor";
import { ServerError } from "@/errors/ServerError";
import { ZodProblem } from "@/helpers/ZodIssues";
import { Step } from "@/models/Step";
import { StepWarning } from "@/models/StepWarning";

export class StepService {
  public constructor() {}

  public validate(unknown: unknown): StepWarning {
    const step = Step.parse.SCHEMA.catch((e) => {
      throw ServerError.invalid_request_body(ZodProblem.issuesSummary(e));
    }).parse(unknown);
    const sensitiveFields = StepWarning.sensitiveFields(step.type).map((dotPath) => ({
      dotPath,
      value: this.getFieldValue(step, dotPath),
    }));
    return {
      fields: sensitiveFields
        .filter(({ value }) => {
          const shouldWarnAboutThisField = value !== undefined && !PropertyExtractor.containsReference(value);
          return shouldWarnAboutThisField;
        })
        .map(({ dotPath }) => dotPath),
    };
  }

  private getFieldValue(step: Step, dotPath: string): string | undefined {
    let current: any = step;
    for (const key of dotPath.split(".")) {
      if (current == null) return undefined;
      current = current[key];
    }
    return typeof current === "string" ? current : undefined;
  }
}
