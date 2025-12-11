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

export class ServerRegistry {
  public static async bootstrap(): Promise<ServerRegistry> {
    return new ServerRegistry();
  }

  private readonly registry: Record<string, any> = {};

  private constructor() {
    // Adapters
    const compressionAdapter = (this.registry[CompressionAdapter.name] = new CompressionAdapter());
    const fileSystemAdapter = (this.registry[FilesystemAdapter.name] = new FilesystemAdapter());
    const encryptionAdapter = (this.registry[EncryptionAdapter.name] = new EncryptionAdapter());
    const scriptAdapter = (this.registry[ScriptAdapter.name] = new ScriptAdapter());
    const s3Adapter = (this.registry[S3Adapter.name] = new S3Adapter());
    const postgresAdapter = (this.registry[PostgresAdapter.name] = new PostgresAdapter());
    const adapterService = (this.registry[AdapterService.name] = new AdapterService(
      compressionAdapter,
      fileSystemAdapter,
      encryptionAdapter,
      scriptAdapter,
      s3Adapter,
      postgresAdapter,
    ));

    // Services
    const stepService = (this.registry[StepService.name] = new StepService());
    const pipelineService = (this.registry[PipelineService.name] = new PipelineService(stepService, adapterService));
    this.registry[CleanupService.name] = new CleanupService();

    // Server
    this.registry[Server.name] = new Server(stepService, pipelineService);
  }

  public get<T>(klass: Class<T>): T {
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }
}
