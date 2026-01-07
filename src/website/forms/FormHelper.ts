import { ProblemDetails } from "@/models/ProblemDetails";
import { ReactNode } from "react";

export namespace FormHelper {
  type FieldsMetaOptions = Record<string, { label: string; description: ReactNode }>;
  type FieldsMetaResult<T extends FieldsMetaOptions> = {
    summary: ReactNode;
    Field: { [K in keyof T]: K };
    Label: Record<keyof T, string>;
    Description: Record<keyof T, ReactNode>;
  };
  export function meta<T extends FieldsMetaOptions>(details: { summary: ReactNode; fields: T }): FieldsMetaResult<T> {
    const Field = {} as { [K in keyof T]: K };
    const Label = {} as Record<keyof T, string>;
    const Description = {} as Record<keyof T, ReactNode>;
    Object.entries(details.fields).forEach(([key, value]) => {
      Field[key as keyof T] = key as any;
      Label[key as keyof T] = value.label;
      Description[key as keyof T] = value.description;
    });
    return { summary: details.summary, Field, Label, Description };
  }

  export async function snoozeBeforeSubmit(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  export function formatError(error: unknown): string {
    return ProblemDetails.isInstance(error)
      ? `${error.problem}${error.details ? ` ${JSON.stringify(error.details, null, 2)}` : ""}`
      : (error as Error).message;
  }

  export function generateStepId(): string {
    const length = 12;
    const alphabet = "abcdefghijklmnopqrstuvwxyz";

    let result = "";
    for (let i = 0; i < length; i++) {
      result += `${alphabet[Math.floor(Math.random() * alphabet.length)]}`;
    }
    return result;
  }
}
