import { Exception } from "@/errors/Exception";

export const PipelineError = Exception.createGroup("PIPELINE", [
  "not_found",
  "already_exists",
  "missing_starting_step",
  "too_many_starting_steps",
  "invalid_step_references",
] as const);
