import { AdapterService } from "@/adapters/AdapterService";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import { ExecutionRepository } from "@/repositories/ExecutionRepository";
import { InMemoryRepository } from "@/repositories/InMemoryRepository";
import { PipelineRepository } from "@/repositories/PipelineRepository";
import { mock, Mock } from "bun:test";

export namespace Test {
  export type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock<T[K]> : never;
  };

  export function impl<T extends Mocked<any>>(mock: T): T extends Mocked<infer U> ? U : never {
    return mock as T extends Mocked<infer U> ? U : never;
  }

  export namespace InMemoryRepositoryRegistry {
    export const inMemoryPipelineRepository: PipelineRepository = new InMemoryRepository<Pipeline>();
    export const inMemoryExecutionRepository: ExecutionRepository =
      new (class InMemoryExecutionRepository extends InMemoryRepository<Execution> {
        public async query(q: { pipelineId: string }): Promise<Execution[]> {
          return super.storage.filter((e) => e.pipelineId === q.pipelineId);
        }
        public async queryLastExecutions(q: { pipelineIds: string[] }): Promise<Map<string, Execution | null>> {
          const result = new Map<string, Execution | null>();
          for (const pipelineId of q.pipelineIds) {
            const lastExecution = super.storage.find((e) => e.pipelineId === pipelineId);
            result.set(pipelineId, lastExecution || null);
          }
          return result;
        }
      })();
  }

  export namespace MockRegistry {
    export const adapterService: Mocked<AdapterService> = {
      submit: mock(),
    };
  }
}
