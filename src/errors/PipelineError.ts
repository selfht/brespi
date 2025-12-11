import { Exception } from "@/errors/Exception";

export const PipelineError = Exception.createGroup("PIPELINE", [
  "not_found",
  "invalid_structure",
  "missing_starting_step",
  "too_many_starting_steps",
  "invalid_step_references",
] as const);
