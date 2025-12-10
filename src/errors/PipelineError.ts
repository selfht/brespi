import { Exception } from "@/errors/Exception";

export const PipelineError = Exception.createGroup("PIPELINE", [
  "not_found",
  "invalid_structure",
  "missing_single_starting_step",
  "invalid_step_references",
] as const);
