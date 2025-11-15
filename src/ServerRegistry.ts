import { Class } from "@/types/Class";
import { Server } from "./Server";
import { AdapterService } from "./adapters/AdapterService";
import { CompressionAdapter } from "./adapters/compression/CompressionAdapter";
import { FileSystemAdapter } from "./adapters/filesystem/FileSystemAdapter";
import { PostgresAdapter } from "./adapters/postgres/PostgresAdapter";
import { PipelineService } from "./services/PipelineService";
import { CleanupService } from "./services/CleanupService";
import { EncryptionAdapter } from "./adapters/encyption/EncryptionAdapter";
import { S3Adapter } from "./adapters/s3/S3Adapter";

export class ServerRegistry {
  public static async bootstrap(): Promise<ServerRegistry> {
    return new ServerRegistry();
  }

  private readonly registry: Record<string, any> = {};

  private constructor() {
    // Adapters
    const postgresAdapter = (this.registry[PostgresAdapter.name] = new PostgresAdapter());
    const compressionAdapter = (this.registry[CompressionAdapter.name] = new CompressionAdapter());
    const fileSystemAdapter = (this.registry[FileSystemAdapter.name] = new FileSystemAdapter());
    const encryptionAdapter = (this.registry[EncryptionAdapter.name] = new EncryptionAdapter());
    const s3Adapter = (this.registry[S3Adapter.name] = new S3Adapter());
    const adapterService = (this.registry[AdapterService.name] = new AdapterService(
      postgresAdapter,
      compressionAdapter,
      fileSystemAdapter,
      encryptionAdapter,
      s3Adapter,
    ));

    // Services
    const pipelineService = (this.registry[PipelineService.name] = new PipelineService(adapterService));
    this.registry[CleanupService.name] = new CleanupService();

    // Server
    this.registry[Server.name] = new Server(pipelineService);
  }

  public get<T>(klass: Class<T>): T {
    const result = this.registry[klass.name] as T;
    if (!result) {
      throw new Error(`No registration for ${klass.name}`);
    }
    return result;
  }
}
