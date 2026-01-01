import { AdapterService } from "@/adapters/AdapterService";
import { $execution } from "@/drizzle/schema";
import { initializeSqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { ConfigurationRepository } from "@/repositories/ConfigurationRepository";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { mock, Mock } from "bun:test";
import { join } from "path";

export namespace Test {
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

  export async function env(env = {} as Partial<Env.Private>) {
    const cwd = await ensureValidCwd();
    const X_BRESPI_ROOT = join(cwd, "opt", "brespi");
    const result: Partial<Env.Private> = {
      X_BRESPI_ROOT,
      X_BRESPI_TMP_ROOT: join(X_BRESPI_ROOT, "tmp"),
      X_BRESPI_DATA_ROOT: join(X_BRESPI_ROOT, "data"),
    };
    return Object.assign(result, env) as Env.Private;
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

    return class MockRegistry {
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

      public static readonly adapterService = registerMockObject<AdapterService>({
        submit: mock(),
      });

      public static resetAllMocks() {
        mockFns.forEach((mock) => mock.mockClear());
      }
    };
  }
}
