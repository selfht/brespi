import { AdapterService } from "@/adapters/AdapterService";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { initializeSqlite } from "@/drizzle/sqlite";
import { Env as AppEnv } from "@/Env";
import { EventBus } from "@/events/EventBus";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { ExecutionService } from "@/services/ExecutionService";
import { OmitBetter } from "@/types/OmitBetter";
import { jest, mock, Mock } from "bun:test";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { Generate } from "../helpers/Generate";

export namespace Test {
  // ============================================================================
  // Utils - Pure, stateless utilities
  // ============================================================================
  export namespace Utils {
    export type Mocked<T> = { cast: () => T } & {
      [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : never;
    };

    export async function waitUntil<T>(
      fn: () => T | Promise<T>,
      condition: (result: T) => boolean,
      { timeout = 5000, interval = 50 }: { timeout?: number; interval?: number } = {},
    ): Promise<T> {
      const startTime = Date.now();
      while (true) {
        const result = await fn();
        if (condition(result)) {
          return result;
        }
        if (Date.now() - startTime >= timeout) {
          throw new Error(`waitUntil timeout after ${timeout}ms`);
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    type Collection<T> = {
      testCases: string[];
      get: (key: string) => T;
    };

    export function createCollection<T>(keyProp: keyof T, testCases: T[]): Collection<T> {
      const collection = new Map<string, T>();
      testCases.forEach((testCase) => {
        let key = "";
        for (let i = 0; true; i++) {
          key = i === 0 ? `${testCase[keyProp]}` : `${testCase[keyProp]} (${i + 1})`;
          if (!collection.has(key)) {
            break;
          }
        }
        collection.set(key, testCase);
      });
      return {
        testCases: [...collection.keys()],
        get: (key) => collection.get(key)!,
      };
    }
  }

  // ============================================================================
  // Fixture - Test data factories for domain objects
  // ============================================================================
  export namespace Fixture {
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

  // ============================================================================
  // Env - Environment setup and resource management
  // ============================================================================
  export namespace Env {
    export interface Context {
      env: AppEnv.Private;
      scratchpad: string;

      // Repositories
      configurationRepository: ConfigurationRepository;
      pipelineRepository: PipelineRepository;
      executionRepository: ExecutionRepository;
      scheduleRepository: ScheduleRepository;

      // Mocks
      eventBusMock: Utils.Mocked<EventBus>;
      executionServiceMock: Utils.Mocked<ExecutionService>;
      adapterServiceMock: Utils.Mocked<AdapterService>;
      filterCapabilityMock: Utils.Mocked<FilterCapability>;
      managedStorageCapabilityMock: Utils.Mocked<ManagedStorageCapability>;

      // Context-bound helpers
      createArtifacts(...artifacts: Array<`${"f" | "d"}:${string}`>): Promise<Artifact[]>;
      createArtifacts(...artifacts: Array<{ name: `${"f" | "d"}:${string}`; content: string }>): Promise<Artifact[]>;
      patchEnv(environment: Record<string, string>): void;
    }

    let envIndex = 1;
    const cleanupTasks: Record<string, () => unknown | Promise<unknown>> = {};

    export async function initialize(): Promise<Context> {
      // Cleanup anything remaining from earlier
      await Promise.all(Object.values(cleanupTasks).map((fn) => fn()));

      // Ensure we're running from the project root
      const cwd = await (async function ensureValidCwd(): Promise<string> {
        const cwd = process.cwd();
        const packageJsonPath = join(cwd, "package.json");
        const packageJsonFile = Bun.file(packageJsonPath);
        if (!(await packageJsonFile.exists())) {
          throw new Error(`Invalid working directory, package.json not found: ${packageJsonPath}`);
        }
        const { name } = await packageJsonFile.json();
        if (name !== "brespi") {
          throw new Error(`Invalid working directory, invalid project name in package.json: ${name}`);
        }
        return cwd;
      })();

      // Setup env
      const unitTestRoot = join(cwd, "opt", "unit", `${envIndex++}`);
      const env = AppEnv.initialize({
        O_BRESPI_STAGE: "development",
        O_BRESPI_COMMIT: "0123456789abcdef0123456789abcdef01234567",
        O_BRESPI_VERSION: "0.0.0",
        X_BRESPI_ROOT: join(unitTestRoot, "brespi"),
      });

      // Setup filesystem
      const scratchpad = join(unitTestRoot, "scratchpad");
      await Promise.all([
        mkdir(env.X_BRESPI_TMP_ROOT, { recursive: true }), //
        mkdir(env.X_BRESPI_DATA_ROOT, { recursive: true }),
        mkdir(scratchpad, { recursive: true }),
      ]);
      cleanupTasks["filesystem"] = async () => {
        console.log(`🗑️ Deleting: ${unitTestRoot}`);
        await rm(unitTestRoot, { recursive: true, force: true });
      };

      // Setup SQLite
      const sqlite = await initializeSqlite(env);
      cleanupTasks["sqlite"] = () => sqlite.close();

      // Mock registration
      const mockFns: Mock<any>[] = [];
      function registerMockObject<T>(mockObject: OmitBetter<Utils.Mocked<T>, "cast">): Utils.Mocked<T> {
        Object.values(mockObject as Record<string, Mock<any>>).forEach((mock) => mockFns.push(mock));
        const extra = { cast: () => mockObject as T } as Pick<Utils.Mocked<T>, "cast">;
        Object.assign(mockObject, extra);
        return mockObject as Utils.Mocked<T>;
      }

      // Repositories
      const configurationRepository = new ConfigurationRepository(env);
      await configurationRepository.initialize();

      const pipelineRepository = new PipelineRepository(configurationRepository);
      const executionRepository = new ExecutionRepository(sqlite);
      const scheduleRepository = new ScheduleRepository(configurationRepository, sqlite);

      // Mocks
      const eventBusMock = registerMockObject<EventBus>({
        publish: mock(),
        subscribe: mock(),
        unsubscribe: mock(),
      });
      const executionServiceMock = registerMockObject<ExecutionService>({
        registerSocket: mock(),
        unregisterSocket: mock(),
        create: mock(),
        find: mock(),
        query: mock(),
      });
      const adapterServiceMock = registerMockObject<AdapterService>({
        submit: mock(),
      });
      const filterCapabilityMock = registerMockObject<FilterCapability>({
        createPredicate: mock(),
      });
      const managedStorageCapabilityMock = registerMockObject<ManagedStorageCapability>({
        insert: mock(),
        select: mock(),
        clean: mock(),
      });

      // Register cleanup tasks
      cleanupTasks["mocks_restore"] = () => {
        mock.restore();
        jest.restoreAllMocks();
        mockFns.forEach((m) => m.mockClear());
      };
      cleanupTasks["temporary_artifacts"] = async () => {
        await rm(env.X_BRESPI_TMP_ROOT, { recursive: true, force: true });
      };

      // Context-bound helpers
      async function createArtifacts(
        ...artifacts: Array<`${"f" | "d"}:${string}` | { name: `${"f" | "d"}:${string}`; content: string }>
      ): Promise<Artifact[]> {
        const result: Artifact[] = [];
        for (const artifact of artifacts) {
          const { destinationId, destinationPath } = Generate.tmpDestination(env);
          const name = typeof artifact === "string" ? artifact.slice(2) : artifact.name.slice(2);
          const type = (typeof artifact === "string" ? artifact : artifact.name).startsWith("f:") ? "file" : ("directory" as const);
          const content = typeof artifact === "string" ? `Content for ${artifact}` : artifact.content;
          if (type === "file") {
            await Bun.write(destinationPath, content);
          } else {
            await Bun.write(join(destinationPath, "index"), content);
          }
          result.push({ id: destinationId, type, name, path: destinationPath });
        }
        return result;
      }

      function patchEnv(environment: Record<string, string>) {
        const originalEnvironment: Record<string, string | undefined> = {};
        Object.keys(environment).forEach((key) => (originalEnvironment[key] = Bun.env[key]));

        Object.entries(environment).forEach(([key, value]) => (Bun.env[key] = value));
        cleanupTasks["env_reset"] = () =>
          Object.entries(originalEnvironment).forEach(([key, value]) => {
            if (value === undefined) {
              delete Bun.env[key];
            } else {
              Bun.env[key] = value;
            }
          });
      }

      return {
        env,
        scratchpad,
        configurationRepository,
        pipelineRepository,
        executionRepository,
        scheduleRepository,
        eventBusMock,
        executionServiceMock,
        adapterServiceMock,
        filterCapabilityMock,
        managedStorageCapabilityMock,
        createArtifacts,
        patchEnv,
      };
    }
  }
}
