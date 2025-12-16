import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { CompressionAdapter } from "./compression/CompressionAdapter";
import { FilesystemAdapter } from "./filesystem/FilesystemAdapter";
import { PostgresAdapter } from "./postgres/PostgresAdapter";
import { EncryptionAdapter } from "./encyption/EncryptionAdapter";
import { S3Adapter } from "./s3/S3Adapter";
import { ScriptAdapter } from "./scripting/ScriptAdapter";

type Handler<S extends Step> = (artifacts: Artifact[], options: S, history: Step[]) => Promise<Artifact[]>;

type InternalRegistry = {
  [T in Step.Type]: Handler<Extract<Step, { type: T }>>;
};

export class AdapterService {
  private readonly registry: InternalRegistry;

  public constructor(
    compressionAdapter: CompressionAdapter,
    fileSystemAdapter: FilesystemAdapter,
    encryptionAdapter: EncryptionAdapter,
    scriptAdapter: ScriptAdapter,
    s3Adapter: S3Adapter,
    postgresAdapter: PostgresAdapter,
  ) {
    this.registry = {
      [Step.Type.filesystem_read]: async (_, options) => {
        return [await fileSystemAdapter.read(options)];
      },
      [Step.Type.filesystem_write]: async (artifacts, options) => {
        await fileSystemAdapter.write(artifacts, options);
        return [];
      },
      [Step.Type.compression]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => compressionAdapter.compress(a, options));
      },
      [Step.Type.decompression]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => compressionAdapter.decompress(a, options));
      },
      [Step.Type.encryption]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => encryptionAdapter.encrypt(a, options));
      },
      [Step.Type.decryption]: async (artifacts, options) => {
        return await this.spreadAndCollect(artifacts, (a) => encryptionAdapter.decrypt(a, options));
      },
      [Step.Type.folder_flatten]: async (artifacts, options) => {
        return await fileSystemAdapter.folderFlatten(artifacts, options);
      },
      [Step.Type.folder_group]: async (artifacts, options) => {
        return [await fileSystemAdapter.folderGroup(artifacts, options)];
      },
      /**
       *
       *
       * TODO: last 5
       *
       *
       */
      [Step.Type.script_execution]: async (artifacts, options) => {
        return await scriptAdapter.execute(artifacts, options);
      },
      [Step.Type.s3_upload]: async (artifacts, options, trail) => {
        await s3Adapter.upload(artifacts, options, trail);
        return [];
      },
      [Step.Type.s3_download]: async (_, options) => {
        return [await s3Adapter.download(options)];
      },
      [Step.Type.postgres_backup]: async (_, options) => {
        return await postgresAdapter.backup(options);
      },
      [Step.Type.postgres_restore]: async (artifacts, options) => {
        await postgresAdapter.restore(artifacts, options);
        return [];
      },
    };
  }

  public async submit<S extends Step>(artifacts: Artifact[], step: S, trail: Step[]): Promise<Artifact[]> {
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
