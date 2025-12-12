import { ProblemDetails } from "@/models/ProblemDetails";

export namespace FormHelper {
  export async function snoozeBeforeSubmit(): Promise<void> {
    // await new Promise((resolve) => setTimeout(resolve, 100));
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
