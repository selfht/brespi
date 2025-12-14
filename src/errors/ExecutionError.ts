import { Exception } from "@/errors/Exception";

export const ExecutionError = Exception.createGroup("EXECUTION", ["not_found", "already_exists"] as const);
