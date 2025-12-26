import { Step } from "../models/Step";

export namespace StepData {
  export function createStep<T extends Step.Type>(
    type: T,
    extraProps = {} as Partial<Extract<Step, { type: T }>>,
  ): Extract<Step, { type: T }> {
    const common = Object.assign(
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        object: "step" as const,
      },
      extraProps,
    );
    switch (type) {
      case Step.Type.filesystem_read: {
        const step: Step.FilesystemRead = {
          type: Step.Type.filesystem_read,
          path: "/tmp/test",
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.filesystem_write: {
        const step: Step.FilesystemWrite = {
          type: Step.Type.filesystem_write,
          path: "/tmp/output",
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.compression: {
        const step: Step.Compression = {
          type: Step.Type.compression,
          algorithm: {
            implementation: "targzip",
            level: 9,
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.decompression: {
        const step: Step.Decompression = {
          type: Step.Type.decompression,
          algorithm: {
            implementation: "targzip",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.encryption: {
        const step: Step.Encryption = {
          type: Step.Type.encryption,
          keyReference: "MY_TEST_ENCRYPTION_KEY",
          algorithm: {
            implementation: "aes256cbc",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.decryption: {
        const step: Step.Decryption = {
          type: Step.Type.decryption,
          keyReference: "MY_TEST_ENCRYPTION_KEY",
          algorithm: {
            implementation: "aes256cbc",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.folder_flatten: {
        const step: Step.FolderFlatten = {
          type: Step.Type.folder_flatten,
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.folder_group: {
        const step: Step.FolderGroup = {
          type: Step.Type.folder_group,
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.filter: {
        const step: Step.Filter = {
          type: Step.Type.filter,
          selection: {
            method: "glob",
            nameGlob: "*.sql",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.script_execution: {
        const step: Step.ScriptExecution = {
          type: Step.Type.script_execution,
          path: "/scripts/test.sh",
          passthrough: false,
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.s3_upload: {
        const step: Step.S3Upload = {
          type: Step.Type.s3_upload,
          bucketReference: "S3_BUCKET_URL",
          baseFolder: "/backups",
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.s3_download: {
        const step: Step.S3Download = {
          type: Step.Type.s3_download,
          bucketReference: "S3_BUCKET_URL",
          baseFolder: "/backups",
          selection: {
            target: "latest",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.postgres_backup: {
        const step: Step.PostgresBackup = {
          type: Step.Type.postgres_backup,
          connectionReference: "POSTGRES_URL",
          databaseSelection: {
            strategy: "all",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.postgres_restore: {
        const step: Step.PostgresRestore = {
          type: Step.Type.postgres_restore,
          connectionReference: "POSTGRES_URL",
          database: "test_db",
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
    }
  }
}
