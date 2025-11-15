import { Artifact } from "@/models/Artifact";
import { PipelineStep } from "@/models/PipelineStep";
import { CompressionAdapter } from "./compression/CompressionAdapter";
import { FileSystemAdapter } from "./filesystem/FileSystemAdapter";
import { PostgresAdapter } from "./postgres/PostgresAdapter";
import { EncryptionAdapter } from "./encyption/EncryptionAdapter";
import { S3Adapter } from "./s3/S3Adapter";

type Handler<S extends PipelineStep> = (artifacts: Artifact[], options: S, history: PipelineStep[]) => Promise<Artifact[]>;

type InternalRegistry = {
  [T in PipelineStep.Type]: Handler<Extract<PipelineStep, { type: T }>>;
};

export class AdapterService {
  private readonly registry: InternalRegistry;

  public constructor(
    postgresAdapter: PostgresAdapter,
    compressionAdapter: CompressionAdapter,
    fileSystemAdapter: FileSystemAdapter,
    encryptionAdapter: EncryptionAdapter,
    s3Adapter: S3Adapter,
  ) {
    this.registry = {
      [PipelineStep.Type.fs_read]: async (_, options) => {
        return await fileSystemAdapter.read(options);
      },
      [PipelineStep.Type.fs_write]: async (artifacts, options) => {
        await fileSystemAdapter.write(artifacts, options);
        return [];
      },
      [PipelineStep.Type.postgres_backup]: async (_, options) => {
        return await postgresAdapter.backup(options);
      },
      [PipelineStep.Type.compression]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => compressionAdapter.compress(a, options));
      },
      [PipelineStep.Type.decompression]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => compressionAdapter.decompress(a, options));
      },
      [PipelineStep.Type.encryption]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => encryptionAdapter.encrypt(a, options));
      },
      [PipelineStep.Type.decryption]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => encryptionAdapter.decrypt(a, options));
      },
      [PipelineStep.Type.s3_upload]: async (artifacts, options, trail) => {
        await s3Adapter.upload(artifacts, options, trail);
        return [];
      },
      [PipelineStep.Type.s3_download]: async (_, options) => {
        return [await s3Adapter.download(options)];
      },
    };
  }

  public async submit<S extends PipelineStep>(artifacts: Artifact[], step: S, trail: PipelineStep[]): Promise<Artifact[]> {
    const handler = this.registry[step.type] as Handler<S>;
    if (!handler) {
      throw new Error(`Unknown step type: ${step.type}`);
    }
    return await handler(artifacts, step, trail);
  }

  private async spreadAndCollect(artifacts: Artifact[], fn: (artifact: Artifact) => Promise<Artifact>) {
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
      result.push(await fn(artifact));
    }
    return result;
  }
}
