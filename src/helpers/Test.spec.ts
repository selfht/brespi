import { AdapterService } from "@/adapters/AdapterService";
import { Env } from "@/Env";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { GenericInMemoryRepository } from "@/repositories/implementations/GenericInMemoryRepository";
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

  export class MockRegistry {
    public static readonly adapterService: Mocked<AdapterService> = {
      submit: mock(),
    };

    public static resetAllMocks() {
      // Iterate through all static properties
      for (const serviceKey of Object.keys(MockRegistry)) {
        const potentialMock = MockRegistry[serviceKey as keyof typeof MockRegistry];
        // Skip if it's a function (like resetAllMocks itself)
        if (typeof potentialMock === "function") {
          continue;
        }
        // Iterate through all methods in the service
        if (typeof potentialMock === "object" && Boolean(potentialMock)) {
          for (const method of Object.values(potentialMock)) {
            if (typeof method === "function" && "mockClear" in method) {
              (method as Mock<any>).mockClear();
            }
          }
        }
      }
    }
  }

  export namespace RepoRegistry {
    export const inMemoryPipelineRepository = new (class inMemoryPipelineRepository extends GenericInMemoryRepository<Pipeline> {})();
    export const inMemoryExecutionRepository = new (class InMemoryExecutionRepository extends GenericInMemoryRepository<Execution> {
      public async query(q: { pipelineId: string }): Promise<Execution[]> {
        throw new Error("Not implemented");
      }
      public async queryMostRecentExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
        throw new Error("Not implemented");
      }
    })();
  }
}
