import { Exception } from "./exception/Exception";

export class ExecutionError {
  public static readonly NS = this.name;
  // crud
  public static readonly not_found: Exception.Fn;
  public static readonly already_exists: Exception.Fn;
  // adapters
  public static readonly unknown: Exception.Fn;
  public static readonly nonzero_script_exit: Exception.Fn<{ exitCode: number; stdall: string }>;
  public static readonly environment_variable_missing: Exception.Fn;
  public static readonly filesystem_item_does_not_exist: Exception.Fn;
  public static readonly filesystem_item_type_invalid: Exception.Fn;
  public static readonly artifact_type_invalid: Exception.Fn<{ name: string; type: string }>;

  static {
    Exception.initializeFields(this);
  }

  public static readonly Postgres = class {
    public static readonly NS = `${ExecutionError.NS}::Postgres`;
    public static readonly backup_failed: Exception.Fn;
    public static readonly restore_failed: Exception.Fn;
    public static readonly restore_requires_exactly_one_artifact: Exception.Fn;

    static {
      Exception.initializeFields(this);
    }
  };

  public static readonly Compression = class {
    public static readonly NS = `${ExecutionError.NS}::Compression`;
    public static readonly directory_is_empty: Exception.Fn;
    public static readonly directory_contains_multiple_children: Exception.Fn;

    static {
      Exception.initializeFields(this);
    }
  };

  public static readonly Encryption = class {
    public static readonly NS = `${ExecutionError.NS}::Encryption`;
    public static readonly algorithm_unsupported: Exception.Fn;

    static {
      Exception.initializeFields(this);
    }
  };
}
