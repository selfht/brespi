import z from "zod/v4";

export namespace ZodProblem {
  export function problematicProperties(e: z.core.$ZodCatchCtx): string[] {
    return e.issues
      .map((issue) => issue.path)
      .filter(Boolean)
      .map((propertyKeys) => propertyKeys!.map((pk) => pk.toString()).join("."));
  }
}
