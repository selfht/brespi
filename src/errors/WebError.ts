import { ServiceError } from "@/errors/ServiceError";

export const WebError = ServiceError.createGroup("WEB", [
  "unknown",
  "route_not_found",
  "invalid_request_body",
  "unauthorized",
  "forbidden",
] as const);
