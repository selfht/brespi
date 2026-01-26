import { AdapterService } from "@/adapters/AdapterService";
import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { initializeSqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { EventBus } from "@/events/EventBus";
import { Generate } from "@/helpers/Generate";
import { Artifact } from "@/models/Artifact";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { ScheduleRepository } from "@/repositories/ScheduleRepository";
import { ExecutionService } from "@/services/ExecutionService";
import { OmitBetter } from "@/types/OmitBetter";
import { mock, Mock } from "bun:test";
import { mkdir, rm } from "fs/promises";
import { join } from "path";

export namespace TestEnvironment {
  type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : never;
  } & {
    cast: () => T;
  };

  export interface Context {
    env: Env.Private;
    scratchpad: string;

    // Real repositories
    configurationRepository: ConfigurationRepository;
    pipelineRepository: PipelineRepository;
    executionRepository: ExecutionRepository;
    scheduleRepository: ScheduleRepository;

    // Mocked services and capabilities
    eventBusMock: Mocked<EventBus>;
    executionServiceMock: Mocked<ExecutionService>;
    adapterServiceMock: Mocked<AdapterService>;
    filterCapabilityMock: Mocked<FilterCapability>;
    managedStorageCapabilityMock: Mocked<ManagedStorageCapability>;

    // Context-bound helpers
    createArtifacts(...artifacts: Array<`${"f" | "d"}:${string}`>): Promise<Artifact[]>;
    createArtifacts(...artifacts: Array<{ name: `${"f" | "d"}:${string}`; content: string }>): Promise<Artifact[]>;
    patchEnvironmentVariables(environment: Record<string, string>): void;
  }

  const originalEnv = { ...Bun.env };
  const cleanupTasks: Array<() => unknown | Promise<unknown>> = [];

  export async function initialize(): Promise<Context> {
    // Cleanup (in reverse order!) anything from an earlier run
    while (cleanupTasks.length > 0) {
      const task = cleanupTasks.pop()!;
      await task();
    }

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
    // We'd have to make this root unique (with a random part) to support parallel unit tests,
    // but Bun is so fast it's not needed
    const unitTestRoot = join(cwd, "opt", "unit-test");
    const env = Env.initialize({
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
    cleanupTasks.push(() => rm(unitTestRoot, { recursive: true, force: true }));

    // Setup SQLite
    const sqlite = await initializeSqlite(env);
    cleanupTasks.push(() => sqlite.close());

    // Mock registration
    const mockFns: Mock<any>[] = [];
    function registerMockObject<T>(mockObject: OmitBetter<Mocked<T>, "cast">): Mocked<T> {
      Object.values(mockObject as Record<string, Mock<any>>).forEach((mock) => mockFns.push(mock));
      const extra = { cast: () => mockObject as T } as Pick<Mocked<T>, "cast">;
      Object.assign(mockObject, extra);
      return mockObject as Mocked<T>;
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

    function patchEnvironmentVariables(environment: Record<string, string>) {
      Object.assign(Bun.env, environment);
      cleanupTasks.push(() => Object.assign(Bun.env, originalEnv));
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
      patchEnvironmentVariables,
    };
  }
}
