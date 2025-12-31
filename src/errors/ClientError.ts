import { Exception } from "./exception/Exception";

export class ClientError {
  public static readonly NS = "Client";
  public static readonly unknown: Exception.Fn;

  static {
    Exception.initializeFields(this);
  }
}
