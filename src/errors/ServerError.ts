import { Exception } from "./exception/Exception";

export class ServerError {
  public static readonly GROUP = "SERVER";
  public static readonly unknown = Exception.for(this, "unknown");
  public static readonly socket_upgrade_failed = Exception.for(this, "socket_upgrade_failed");
  public static readonly route_not_found = Exception.for(this, "route_not_found");
  public static readonly missing_query_parameter = Exception.for(this, "missing_query_parameter");
  public static readonly invalid_request_body = Exception.for(this, "invalid_request_body");
  public static readonly unauthorized = Exception.for(this, "unauthorized");
  public static readonly forbidden = Exception.for(this, "forbidden");
}
