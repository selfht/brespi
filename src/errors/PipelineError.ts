import { Exception } from "./exception/Exception";

export class PipelineError {
  public static readonly _NAME_ = "PipelineError";
  public static readonly not_found: Exception.Fn<{ id: string }>;
  public static readonly already_exists: Exception.Fn<{ id: string }>;
  public static readonly missing_starting_step: Exception.Fn;
  public static readonly too_many_starting_steps: Exception.Fn;
  public static readonly invalid_step_references: Exception.Fn;

  static {
    Exception.initializeFields(this);
  }
}
