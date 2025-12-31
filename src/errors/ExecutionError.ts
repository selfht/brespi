import { Exception } from "./exception/Exception";

export class ExecutionError {
  public static readonly GROUP = "EXECUTION";
  public static readonly not_found = Exception.for(this, "not_found");
  public static readonly already_exists = Exception.for(this, "already_exists");
}
