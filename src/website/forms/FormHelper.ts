import { ProblemDetails } from "@/models/ProblemDetails";
import { ReactNode } from "react";

export namespace FormHelper {
  export function fields<T extends Record<string, { label: string; description: ReactNode }>>(
    summary: T,
  ): { Field: Record<keyof T, keyof T>; Label: Record<keyof T, string>; Description: Record<keyof T, ReactNode> } {
    const Field = {} as Record<keyof T, keyof T>;
    const Label = {} as Record<keyof T, string>;
    const Description = {} as Record<keyof T, ReactNode>;
    Object.entries(summary).forEach(([key, value]) => {
      Field[key as keyof T] = key;
      Label[key as keyof T] = value.label;
      Description[key as keyof T] = value.description;
    });
    return { Field, Label, Description };
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
