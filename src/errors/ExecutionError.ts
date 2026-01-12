import { Exception } from "./exception/Exception";

export class ExecutionError {
  // crud
  public static readonly not_found: Exception.Fn;
  public static readonly already_exists: Exception.Fn;
  // adapters
  public static readonly unknown: Exception.Fn;
  public static readonly nonzero_script_exit: Exception.Fn<{ exitCode: number; stdall: string }>;
  public static readonly environment_variable_missing: Exception.Fn<{ name: string }>;
  public static readonly algorithm_unsupported: Exception.Fn<{ algorithm: string }>;
  // artifacts, files & folder
  public static readonly artifact_type_invalid: Exception.Fn<{ name: string; type: string; requiredType: string }>;
  public static readonly artifact_count_invalid: Exception.Fn<{ count: number; min?: number; max?: number }>;
  public static readonly fspath_does_not_exist: Exception.Fn<{ path: string }>;
  public static readonly fspath_type_invalid: Exception.Fn<{ path: string; type: string; requiredType: string }>;
  public static readonly fsdir_children_count_invalid: Exception.Fn<{ path: string; count: number; min?: number; max?: number }>;
  // managed storage
  public static readonly managed_storage_corrupted: Exception.Fn<{ descriptor: "manifest" | "listing" }>;
  public static readonly managed_storage_manifest_empty: Exception.Fn;
  public static readonly managed_storage_version_not_found: Exception.Fn<{ version: string }>;
  public static readonly managed_storage_version_not_uniquely_identified: Exception.Fn<{ version: string }>;
  // compression/decompression
  public static readonly compression_failed: Exception.Fn<{ cause: string }>;
  public static readonly decompression_failed: Exception.Fn<{ cause: string }>;
  // encryption/decryption
  public static readonly encryption_failed: Exception.Fn<{ cause: string }>;
  public static readonly decryption_failed: Exception.Fn<{ cause: string }>;
  // postgres
  public static readonly postgres_backup_failed: Exception.Fn<{ cause: string }>;
  public static readonly postgres_restore_failed: Exception.Fn<{ cause: string }>;

  static {
    Exception.initializeFields(this);
  }
}
