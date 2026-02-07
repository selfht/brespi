import { Exception } from "./exception/Exception";

export class PropertyError {
  public static readonly variable_unresolved: Exception.Fn<{ name: string }>;

  static {
    Exception.initializeFields(this);
  }
}
