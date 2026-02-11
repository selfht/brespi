import { Exception } from "./exception/Exception";

export class ServerError {
  public static readonly _NAME_ = "ServerError";

  public static readonly unknown: Exception.Fn;
  public static readonly socket_upgrade_failed: Exception.Fn;
  public static readonly route_not_found: Exception.Fn;
  public static readonly missing_query_parameter: Exception.Fn;
  public static readonly invalid_request_body: Exception.Fn;
  public static readonly unauthorized: Exception.Fn;
  public static readonly forbidden: Exception.Fn;

  static {
    Exception.initializeFields(this);
  }
}
