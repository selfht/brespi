import { Exception } from "./exception/Exception";

export class ScheduleError {
  public static readonly not_found: Exception.Fn<{ id: string }>;
  public static readonly already_exists: Exception.Fn<{ id: string }>;
  public static readonly invalid_cron_expression: Exception.Fn;

  static {
    Exception.initializeFields(this);
  }
}
