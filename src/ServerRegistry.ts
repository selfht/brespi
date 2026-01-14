import { Class } from "@/types/Class";
import { AdapterService } from "./adapters/AdapterService";
import { CompressionAdapter } from "./adapters/compression/CompressionAdapter";
import { EncryptionAdapter } from "./adapters/encyption/EncryptionAdapter";
import { FilesystemAdapter } from "./adapters/filesystem/FilesystemAdapter";
import { FilterAdapter } from "./adapters/filter/FilterAdapter";
import { PostgresAdapter } from "./adapters/postgres/PostgresAdapter";
import { S3Adapter } from "./adapters/s3/S3Adapter";
import { ScriptAdapter } from "./adapters/scripting/ScriptAdapter";
import { FilterCapability } from "./capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "./capabilities/managedstorage/ManagedStorageCapability";
import { Sqlite } from "./drizzle/sqlite";
import { Env } from "./Env";
import { ConfigurationRepository } from "./repositories/ConfigurationRepository";
import { ExecutionRepository } from "./repositories/ExecutionRepository";
import { PipelineRepository } from "./repositories/PipelineRepository";
import { Server } from "./Server";
import { CleanupService } from "./services/CleanupService";
import { ConfigurationService } from "./services/ConfigurationService";
import { ExecutionService } from "./services/ExecutionService";
import { PipelineService } from "./services/PipelineService";
import { RestrictedService } from "./services/RestrictedService";
import { StepService } from "./services/StepService";
import { ScheduleRepository } from "./repositories/ScheduleRepository";
import { ScheduleService } from "./services/ScheduleService";
import { EventBus } from "./events/EventBus";

export class ServerRegistry {
  public static async bootstrap(env: Env.Private, sqlite: Sqlite): Promise<ServerRegistry> {
    return new ServerRegistry(env, sqlite);
  }

  private readonly registry: Record<string, any> = {};

  private constructor(env: Env.Private, sqlite: Sqlite) {
    // Capabilities
    const filterCapability = this.register(FilterCapability, []);
    const managedStorageCapability = this.register(ManagedStorageCapability, []);

    // Adapters
    const compressionAdapter = this.register(CompressionAdapter, [env]);
    const encryptionAdapter = this.register(EncryptionAdapter, [env]);
    const filterAdapter = this.register(FilterAdapter, [env, filterCapability]);
    const scriptAdapter = this.register(ScriptAdapter, [env]);
    const fileSystemAdapter = this.register(FilesystemAdapter, [env, managedStorageCapability, filterCapability]);
    const s3Adapter = this.register(S3Adapter, [env, managedStorageCapability, filterCapability]);
    const postgresAdapter = this.register(PostgresAdapter, [env]);
    const adapterService = this.register(AdapterService, [
      fileSystemAdapter,
      compressionAdapter,
      encryptionAdapter,
      filterAdapter,
      scriptAdapter,
      s3Adapter,
      postgresAdapter,
    ]);

    // Events bus
    const eventBus = this.register(EventBus, []);

    // Repositories
    const configurationRepository = this.register(ConfigurationRepository, [env]);
    const pipelineRepository = this.register(PipelineRepository, [configurationRepository]);
    const executionRepository = this.register(ExecutionRepository, [sqlite]);
    const scheduleRepository = this.register(ScheduleRepository, [configurationRepository, sqlite]);

    // Services
    const stepService = this.register(StepService, []);
    const configurationService = this.register(ConfigurationService, [configurationRepository]);
    const pipelineService = this.register(PipelineService, [eventBus, pipelineRepository, executionRepository, stepService]);
    const executionService = this.register(ExecutionService, [env, executionRepository, pipelineRepository, adapterService]);
    const restrictedService = this.register(RestrictedService, [sqlite, configurationRepository]);
    this.register(ScheduleService, [eventBus, scheduleRepository, executionService]);
    this.register(CleanupService, [env]);

    // Server
    this.register(Server, [env, stepService, pipelineService, executionService, restrictedService, configurationService]);
  }

  public get<T>(klass: Class<T>): T {
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }

  private register<C extends Class>(Klass: C, parameters: ConstructorParameters<C>): InstanceType<C> {
    const instance: InstanceType<C> = new Klass(...parameters);
    this.registry[Klass.name] = instance;
    return instance;
  }
}
