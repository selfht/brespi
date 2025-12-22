import { Exception } from "@/errors/Exception";

export const ServerError = Exception.createGroup("SERVER", [
  "unknown",
  "socket_upgrade_failed",
  "route_not_found",
  "missing_query_parameter",
  "invalid_request_body",
  "unauthorized",
  "forbidden",
] as const);
