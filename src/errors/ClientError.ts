import { Exception } from "./exception/Exception";

export class ClientError {
  public static readonly _NAME_ = "ClientError";
  public static readonly unknown: Exception.Fn;

  static {
    Exception.initializeFields(this);
  }
}
