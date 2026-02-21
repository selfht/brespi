import { Exception } from "./exception/Exception";

export class NotificationError {
  public static readonly _NAME_ = "NotificationError";
  public static readonly policy_not_found: Exception.Fn<{ id: string }>;
  public static readonly policy_already_exists: Exception.Fn<{ id: string }>;

  static {
    Exception.initializeFields(this);
  }
}
