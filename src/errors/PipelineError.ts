import { Exception } from "./exception/Exception";

export class PipelineError {
  public static readonly GROUP = "PIPELINE";
  public static readonly not_found = Exception.for(this, "not_found");
  public static readonly already_exists = Exception.for(this, "already_exists");
  public static readonly missing_starting_step = Exception.for(this, "missing_starting_step");
  public static readonly too_many_starting_steps = Exception.for(this, "too_many_starting_steps");
  public static readonly invalid_step_references = Exception.for(this, "invalid_step_references");
}
