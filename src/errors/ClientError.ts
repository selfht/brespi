import { Exception } from "./exception/Exception";

export class ClientError {
  public static readonly GROUP = "CLIENT";
  public static readonly unknown = Exception.for(this, "unknown");
}
