import { AdapterService } from "@/adapters/AdapterService";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { InMemoryRepository } from "@/repositories/InMemoryRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { mock, Mock } from "bun:test";
import { CommandHelper } from "./CommandHelper";
import { Env } from "@/Env";
import { join } from "path";

export namespace Test {
  export type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : never;
  };

  export function impl<T extends Mocked<any>>(mock: T) {
    return mock as T extends Mocked<infer U> ? U : never;
  }

  export async function env(env = {} as Partial<Env.Private>) {
    const cwd = await ensureValidCwd();
    const X_BRESPI_ROOT = join(cwd, "opt", "testbrespi");
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

  export namespace MockRegistry {
    export const adapterService: Mocked<AdapterService> = {
      submit: mock(),
    };
    export const commandHelper: Mocked<CommandHelper> = {
      execute: mock(),
    };
  }

  export namespace RepoRegistry {
    export const inMemoryPipelineRepository: PipelineRepository = new InMemoryRepository<Pipeline>();
    export const inMemoryExecutionRepository: ExecutionRepository =
      new (class InMemoryExecutionRepository extends InMemoryRepository<Execution> {
        public async query(q: { pipelineId: string }): Promise<Execution[]> {
          return super.storage.filter((e) => e.pipelineId === q.pipelineId);
        }
        public async queryMostRecentExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
          const result = new Map<string, Execution | null>();
          for (const pipelineId of q.pipelineIds) {
            const lastExecution = super.storage.find((e) => e.pipelineId === pipelineId);
            result.set(pipelineId, lastExecution || null);
          }
          return result;
        }
      })();
  }
}
