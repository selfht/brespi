import { Class } from "@/types/Class";
import { Server } from "./Server";
import { AdapterService } from "./adapters/AdapterService";
import { CompressionAdapter } from "./adapters/compression/CompressionAdapter";
import { FilesystemAdapter } from "./adapters/filesystem/FilesystemAdapter";
import { PostgresAdapter } from "./adapters/postgres/PostgresAdapter";
import { PipelineService } from "./services/PipelineService";
import { CleanupService } from "./services/CleanupService";
import { EncryptionAdapter } from "./adapters/encyption/EncryptionAdapter";
import { S3Adapter } from "./adapters/s3/S3Adapter";
import { ScriptAdapter } from "./adapters/scripting/ScriptAdapter";
import { StepService } from "./services/StepService";
import { ExecutionService } from "./services/ExecutionService";
import { PipelineRepository } from "./repositories/PipelineRepository";
import { ExecutionRepository } from "./repositories/ExecutionRepository";
import { FilterAdapter } from "./adapters/filter/FilterAdapter";
import { Env } from "./Env";

export class ServerRegistry {
  public static async bootstrap(env: Env.Private): Promise<ServerRegistry> {
    return new ServerRegistry(env);
  }

  private readonly registry: Record<string, any> = {};

  private constructor(env: Env.Private) {
    // Adapters
    const fileSystemAdapter = (this.registry[FilesystemAdapter.name] = new FilesystemAdapter(env));
    const compressionAdapter = (this.registry[CompressionAdapter.name] = new CompressionAdapter(env));
    const encryptionAdapter = (this.registry[EncryptionAdapter.name] = new EncryptionAdapter(env));
    const filterAdapter = (this.registry[FilterAdapter.name] = new FilterAdapter(env));
    const scriptAdapter = (this.registry[ScriptAdapter.name] = new ScriptAdapter(env));
    const s3Adapter = (this.registry[S3Adapter.name] = new S3Adapter(env));
    const postgresAdapter = (this.registry[PostgresAdapter.name] = new PostgresAdapter(env));
    const adapterService = (this.registry[AdapterService.name] = new AdapterService(
      fileSystemAdapter,
      compressionAdapter,
      encryptionAdapter,
      filterAdapter,
      scriptAdapter,
      s3Adapter,
      postgresAdapter,
    ));

    // Repositories
    const pipelineRepository = (this.registry[PipelineRepository.name] = new PipelineRepository());
    const executionRepository = (this.registry[ExecutionRepository.name] = new ExecutionRepository());

    // Services
    const stepService = (this.registry[StepService.name] = new StepService());
    const pipelineService = (this.registry[PipelineService.name] = new PipelineService(
      pipelineRepository,
      executionRepository,
      stepService,
    ));
    const executionService = (this.registry[ExecutionService.name] = new ExecutionService(
      env,
      executionRepository,
      pipelineRepository,
      adapterService,
    ));
    this.registry[CleanupService.name] = new CleanupService();

    // Server
    this.registry[Server.name] = new Server(env, stepService, pipelineService, executionService);
  }

  public get<T>(klass: Class<T>): T {
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }
}
