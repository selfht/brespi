import { AdapterService } from "@/adapters/AdapterService";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { $execution, $scheduleMetadata } from "@/drizzle/schema";
import { initializeSqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { jest, mock, Mock } from "bun:test";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { Generate } from "../helpers/Generate";
import { ExecutionService } from "@/services/ExecutionService";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { EventBus } from "@/events/EventBus";

export namespace Test {
  const cleanupTasks: Record<string, () => unknown | Promise<unknown>> = {
    mocks_restore: () => {
      mock.restore();
      jest.restoreAllMocks();
    },
    temporary_artifacts: async () => {
      const { X_BRESPI_TMP_ROOT } = await buildEnv();
      await rm(X_BRESPI_TMP_ROOT, { recursive: true, force: true });
      await mkdir(X_BRESPI_TMP_ROOT);
    },
  };
  export async function cleanup() {
    await Promise.all(Object.values(cleanupTasks).map((fn) => fn()));
  }

  export type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : never;
  };

  export function impl<T extends Mocked<any>>(mock: T) {
    return mock as T extends Mocked<infer U> ? U : never;
  }

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

  export async function getScratchpad() {
    const scratchpad = join(await ensureValidCwd(), "opt", "scratchpad");
    cleanupTasks["scratchpad"] = () => rm(scratchpad, { force: true, recursive: true });
    return { scratchpad };
  }

  export async function buildEnv(overrides = {} as Partial<Env.Private>): Promise<Env.Private> {
    return {
      ...Env.initialize({
        O_BRESPI_STAGE: "development",
        X_BRESPI_ROOT: join(await ensureValidCwd(), "opt", "brespi"),
      }),
      ...overrides,
    };
  }

  export async function patchEnv(environment = {} as Record<string, string>) {
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

  export async function createArtifacts(...artifacts: Array<`${"f" | "d"}:${string}`>): Promise<Artifact[]>;
  export async function createArtifacts(...artifacts: Array<{ name: `${"f" | "d"}:${string}`; content: string }>): Promise<Artifact[]>;
  export async function createArtifacts(
    ...artifacts: Array<`${"f" | "d"}:${string}` | { name: `${"f" | "d"}:${string}`; content: string }>
  ): Promise<Artifact[]> {
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
      const { destinationId, destinationPath } = Generate.tmpDestination(await buildEnv());
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

  async function ensureValidCwd(): Promise<string> {
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

  export async function initializeMockRegistry() {
    const sqlite = await initializeSqlite({ X_BRESPI_DATABASE: ":memory:" } as Env.Private);

    const mockFns: Mock<any>[] = [];
    function registerMockObject<T>(mockObject: Mocked<T>): Mocked<T> {
      Object.values(mockObject as Record<string, Mock<any>>).forEach((mock) => mockFns.push(mock));
      return mockObject;
    }

    class MockRegistry {
      public static readonly eventBus = registerMockObject<EventBus>({
        publish: mock(),
        subscribe: mock(),
        unsubscribe: mock(),
      });

      public static readonly configurationRepository = new ConfigurationRepository({ X_BRESPI_CONFIGURATION: ":memory:" } as Env.Private);
      public static readonly pipelineRepository = new PipelineRepository(this.configurationRepository);
      public static readonly executionRepository = new (class extends ExecutionRepository {
        public constructor() {
          super(sqlite);
        }
        public async removeAll(): Promise<void> {
          await sqlite.delete($execution);
        }
      })();
      public static readonly scheduleRepository = new (class extends ScheduleRepository {
        public constructor() {
          super(MockRegistry.configurationRepository, sqlite);
        }
        public async removeAll(): Promise<void> {
          await sqlite.delete($scheduleMetadata);
        }
      })();

      public static readonly filterCapabilityMock = registerMockObject<FilterCapability>({
        createPredicate: mock(),
      });
      public static readonly managedStorageCapabilityMock = registerMockObject<ManagedStorageCapability>({
        insert: mock(),
        select: mock(),
        clean: mock(),
      });
      public static readonly executionService = registerMockObject<ExecutionService>({
        registerSocket: mock(),
        unregisterSocket: mock(),
        create: mock(),
        find: mock(),
        query: mock(),
      });
      public static readonly adapterService = registerMockObject<AdapterService>({
        submit: mock(),
      });

      public static resetAllMocks() {
        mockFns.forEach((mock) => mock.mockClear());
      }
    }

    cleanupTasks["mock_registry_mocks_reset"] = () => MockRegistry.resetAllMocks();
    cleanupTasks["mock_registry_repositories_clear"] = () => {
      MockRegistry.pipelineRepository.deleteAll();
      MockRegistry.executionRepository.removeAll();
      MockRegistry.scheduleRepository.removeAll();
    };
    return MockRegistry;
  }

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
      case Step.Type.postgres_backup: {
        const step: Step.PostgresBackup = {
          type: Step.Type.postgres_backup,
          connectionReference: "MY_POSTGRES_URL",
          toolkit: { resolution: "automatic" },
          databaseSelection: {
            method: "all",
          },
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
      case Step.Type.postgres_restore: {
        const step: Step.PostgresRestore = {
          type: Step.Type.postgres_restore,
          connectionReference: "MY_POSTGRES_URL",
          toolkit: { resolution: "automatic" },
          database: "test_db",
          ...common,
        };
        return step as Extract<Step, { type: T }>;
      }
    }
  }
}
