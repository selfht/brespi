import { Event } from "@/events/Event";
import { Execution } from "@/models/Execution";
import { Outcome } from "@/models/Outcome";
import { Step } from "@/models/Step";
import { Temporal } from "@js-temporal/polyfill";

export namespace TestFixture {
  type EventOverrides = {
    trigger?: "ad_hoc" | "schedule";
    execution?: Execution;
    executionOverrides?: Partial<Execution>;
  };

  export function createExecutionStartedEvent(
    overrides: EventOverrides = {},
  ): Extract<Event, { type: Event.Type.execution_started }> {
    return {
      id: Bun.randomUUIDv7(),
      object: "event",
      published: Temporal.Now.plainDateTimeISO(),
      type: Event.Type.execution_started,
      data: {
        trigger: overrides.trigger ?? "schedule",
        execution: overrides.execution ?? createExecution({ result: null, ...overrides.executionOverrides }),
      },
    };
  }

  export function createExecutionCompletedEvent(
    overrides: EventOverrides & { outcome?: Outcome } = {},
  ): Extract<Event, { type: Event.Type.execution_completed }> {
    const outcome = overrides.outcome ?? Outcome.success;
    return {
      id: Bun.randomUUIDv7(),
      object: "event",
      published: Temporal.Now.plainDateTimeISO(),
      type: Event.Type.execution_completed,
      data: {
        trigger: overrides.trigger ?? "schedule",
        execution:
          overrides.execution ??
          createExecution({
            result: {
              outcome,
              duration: Temporal.Duration.from({ seconds: 42 }),
              completedAt: Temporal.Now.plainDateTimeISO(),
            },
            ...overrides.executionOverrides,
          }),
      },
    };
  }

  export function createExecution(overrides: Partial<Execution> = {}): Execution {
    return {
      id: Bun.randomUUIDv7(),
      object: "execution",
      pipelineId: "pipeline-123",
      startedAt: Temporal.Now.plainDateTimeISO(),
      actions: [],
      result: {
        outcome: Outcome.success,
        duration: Temporal.Duration.from({ seconds: 42 }),
        completedAt: Temporal.Now.plainDateTimeISO(),
      },
      ...overrides,
    };
  }

  export function createStep<T extends Step.Type>(
    type: T,
    overrides = {} as Partial<Extract<Step, { type: T }>>,
  ): Extract<Step, { type: T }> {
    const common = Object.assign(
      {
        id: Bun.randomUUIDv7(),
        previousId: null,
        object: "step" as const,
      },
      overrides,
    );
    switch (type) {
      case Step.Type.filesystem_read: {
        const step: Step.FilesystemRead = {
          type: Step.Type.filesystem_read,
          path: "/tmp/test",
          managedStorage: null,
          filterCriteria: null,
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.filesystem_write: {
        const step: Step.FilesystemWrite = {
          type: Step.Type.filesystem_write,
          folderPath: "/app/opt/files",
          managedStorage: false,
          retention: null,
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
          keyReference: "MY_ENCRYPTION_KEY",
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
          keyReference: "MY_ENCRYPTION_KEY",
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
          filterCriteria: {
            method: "glob",
            nameGlob: "*.sql",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.custom_script: {
        const step: Step.CustomScript = {
          type: Step.Type.custom_script,
          path: "/scripts/test.sh",
          passthrough: false,
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.s3_upload: {
        const step: Step.S3Upload = {
          type: Step.Type.s3_upload,
          connection: {
            bucket: "bucko",
            endpoint: "http://s3:4566",
            region: null,
            accessKeyReference: "MY_S3_ACCESS_KEY",
            secretKeyReference: "MY_S3_SECRET_KEY",
          },
          basePrefix: "/backups",
          retention: null,
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.s3_download: {
        const step: Step.S3Download = {
          type: Step.Type.s3_download,
          connection: {
            bucket: "bucko",
            endpoint: "http://s3:4566",
            region: null,
            accessKeyReference: "MY_S3_ACCESS_KEY",
            secretKeyReference: "MY_S3_SECRET_KEY",
          },
          basePrefix: "/backups",
          managedStorage: {
            target: "latest",
          },
          filterCriteria: null,
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.postgresql_backup: {
        const step: Step.PostgresqlBackup = {
          type: Step.Type.postgresql_backup,
          connectionReference: "MY_POSTGRESQL_URL",
          toolkit: { resolution: "automatic" },
          databaseSelection: {
            method: "all",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.postgresql_restore: {
        const step: Step.PostgresqlRestore = {
          type: Step.Type.postgresql_restore,
          connectionReference: "MY_POSTGRESQL_URL",
          toolkit: { resolution: "automatic" },
          database: "test_db",
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.mariadb_backup: {
        const step: Step.MariadbBackup = {
          type: Step.Type.mariadb_backup,
          connectionReference: "MY_MARIADB_URL",
          toolkit: { resolution: "automatic" },
          databaseSelection: {
            method: "all",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.mariadb_restore: {
        const step: Step.MariadbRestore = {
          type: Step.Type.mariadb_restore,
          connectionReference: "MY_MARIADB_URL",
          toolkit: { resolution: "automatic" },
          database: "test_db",
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
    }
  }
}
