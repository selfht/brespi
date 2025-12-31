import { Exception } from "./exception/Exception";

export namespace AdapterError {
  export class S3 {
    public static readonly GROUP = "ADAPTER::S3";
    public static readonly encountered_non_file_artifact = Exception.for(this, "encountered_non_file_artifact");
  }

  export class Filesystem {
    public static readonly GROUP = "ADAPTER::FILESYSTEM";
    public static readonly encountered_non_file_artifact = Exception.for(this, "encountered_non_file_artifact");
  }

  export class Postgres {
    public static readonly GROUP = "ADAPTER::POSTGRES";
    public static readonly script_exited_with_error = Exception.for(this, "script_exited_with_error");
    public static readonly backup_failed = Exception.for(this, "backup_failed");
    public static readonly restore_requires_exactly_one_artifact = Exception.for(this, "restore_requires_exactly_one_artifact");
    public static readonly invalid_artifact_type = Exception.for(this, "invalid_artifact_type");
    public static readonly restore_failed = Exception.for(this, "restore_failed");
  }

  export class Compression {
    public static readonly GROUP = "ADAPTER::COMPRESSION";
    public static readonly compression_failed = Exception.for(this, "compression_failed");
    public static readonly unsupported_artifact_type = Exception.for(this, "unsupported_artifact_type");
    public static readonly decompression_failed = Exception.for(this, "decompression_failed");
    public static readonly directory_is_empty = Exception.for(this, "directory_is_empty");
    public static readonly directory_contains_multiple_children = Exception.for(this, "directory_contains_multiple_children");
  }

  export class Encryption {
    public static readonly GROUP = "ADAPTER::ENCRYPTION";
    public static readonly unsupported_artifact_type = Exception.for(this, "unsupported_artifact_type");
    public static readonly failed_to_read_iv = Exception.for(this, "failed_to_read_iv");
    public static readonly unsupported_algorithm = Exception.for(this, "unsupported_algorithm");
  }

  export class Script {
    public static readonly GROUP = "ADAPTER::SCRIPT";
    public static readonly execution_failed = Exception.for(this, "execution_failed");
    public static readonly script_exited_with_error = Exception.for(this, "script_exited_with_error");
  }
}
