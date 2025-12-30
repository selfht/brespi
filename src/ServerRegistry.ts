import { Class } from "@/types/Class";
import { AdapterService } from "./adapters/AdapterService";
import { CompressionAdapter } from "./adapters/compression/CompressionAdapter";
import { EncryptionAdapter } from "./adapters/encyption/EncryptionAdapter";
import { FilesystemAdapter } from "./adapters/filesystem/FilesystemAdapter";
import { FilterAdapter } from "./adapters/filter/FilterAdapter";
import { PostgresAdapter } from "./adapters/postgres/PostgresAdapter";
import { S3Adapter } from "./adapters/s3/S3Adapter";
import { ScriptAdapter } from "./adapters/scripting/ScriptAdapter";
import { ManagedStorageCapability } from "./capabilities/ManagedStorageCapability";
import { Env } from "./Env";
import { ExecutionRepositoryDefault } from "./repositories/implementations/ExecutionRepositoryDefault";
import { PipelineRepositoryDefault } from "./repositories/implementations/PipelineRepositoryDefault";
import { Server } from "./Server";
import { CleanupService } from "./services/CleanupService";
import { ExecutionService } from "./services/ExecutionService";
import { PipelineService } from "./services/PipelineService";
import { RestrictedService } from "./services/RestrictedService";
import { StepService } from "./services/StepService";
import { FilterCapability } from "./capabilities/FilterCapability";

export class ServerRegistry {
  public static async bootstrap(env: Env.Private): Promise<ServerRegistry> {
    return new ServerRegistry(env);
  }

  private readonly registry: Record<string, any> = {};

  private constructor(env: Env.Private) {
    // Capabilities
    const filterCapability = (this.registry[FilterCapability.name] = new FilterCapability());
    const managedStorageCapability = (this.registry[ManagedStorageCapability.name] = new ManagedStorageCapability());

    // Adapters
    const fileSystemAdapter = (this.registry[FilesystemAdapter.name] = new FilesystemAdapter(
      env,
      managedStorageCapability,
      filterCapability,
    ));
    const compressionAdapter = (this.registry[CompressionAdapter.name] = new CompressionAdapter(env));
    const encryptionAdapter = (this.registry[EncryptionAdapter.name] = new EncryptionAdapter(env));
    const filterAdapter = (this.registry[FilterAdapter.name] = new FilterAdapter(env, filterCapability));
    const scriptAdapter = (this.registry[ScriptAdapter.name] = new ScriptAdapter(env));
    const s3Adapter = (this.registry[S3Adapter.name] = new S3Adapter(env, managedStorageCapability, filterCapability));
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
    const pipelineRepositoryDefault = (this.registry[PipelineRepositoryDefault.name] = new PipelineRepositoryDefault());
    const executionRepositoryDefault = (this.registry[ExecutionRepositoryDefault.name] = new ExecutionRepositoryDefault());

    // Services
    const stepService = (this.registry[StepService.name] = new StepService());
    const pipelineService = (this.registry[PipelineService.name] = new PipelineService(
      pipelineRepositoryDefault,
      executionRepositoryDefault,
      stepService,
    ));
    const executionService = (this.registry[ExecutionService.name] = new ExecutionService(
      env,
      executionRepositoryDefault,
      pipelineRepositoryDefault,
      adapterService,
    ));
    const restrictedService = (this.registry[RestrictedService.name] = new RestrictedService(pipelineRepositoryDefault));
    this.registry[CleanupService.name] = new CleanupService(env);

    // Server
    this.registry[Server.name] = new Server(env, stepService, pipelineService, executionService, restrictedService);
  }

  public get<T>(klass: Class<T>): T {
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }
}
