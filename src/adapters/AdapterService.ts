import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { AdapterResult } from "./AdapterResult";
import { CompressionAdapter } from "./compression/CompressionAdapter";
import { EncryptionAdapter } from "./encyption/EncryptionAdapter";
import { FilesystemAdapter } from "./filesystem/FilesystemAdapter";
import { FilterAdapter } from "./filter/FilterAdapter";
import { PostgresAdapter } from "./postgres/PostgresAdapter";
import { S3Adapter } from "./s3/S3Adapter";
import { ScriptAdapter } from "./scripting/ScriptAdapter";

type Handler<S extends Step> = (artifacts: Artifact[], step: S, trail: StepWithRuntime[]) => Promise<AdapterResult>;

type InternalRegistry = {
  [T in Step.Type]: Handler<Extract<Step, { type: T }>>;
};

export class AdapterService {
  private readonly registry: InternalRegistry;

  public constructor(
    fileSystemAdapter: FilesystemAdapter,
    compressionAdapter: CompressionAdapter,
    encryptionAdapter: EncryptionAdapter,
    filterAdapter: FilterAdapter,
    scriptAdapter: ScriptAdapter,
    s3Adapter: S3Adapter,
    postgresAdapter: PostgresAdapter,
  ) {
    this.registry = {
      [Step.Type.filesystem_read]: async (_, options) => {
        return AdapterResult.create(await fileSystemAdapter.read(options));
      },
      [Step.Type.filesystem_write]: async (artifacts, options, trail) => {
        await fileSystemAdapter.write(artifacts, options, trail);
        return AdapterResult.create();
      },
      [Step.Type.compression]: async (artifacts, options) => {
        return AdapterResult.create(await this.spreadAndCollect(artifacts, (a) => compressionAdapter.compress(a, options)));
      },
      [Step.Type.decompression]: async (artifacts, options) => {
        return AdapterResult.create(await this.spreadAndCollect(artifacts, (a) => compressionAdapter.decompress(a, options)));
      },
      [Step.Type.encryption]: async (artifacts, options) => {
        return AdapterResult.create(await this.spreadAndCollect(artifacts, (a) => encryptionAdapter.encrypt(a, options)));
      },
      [Step.Type.decryption]: async (artifacts, options) => {
        return AdapterResult.create(await this.spreadAndCollect(artifacts, (a) => encryptionAdapter.decrypt(a, options)));
      },
      [Step.Type.folder_flatten]: async (artifacts, options) => {
        return AdapterResult.create(await fileSystemAdapter.folderFlatten(artifacts, options));
      },
      [Step.Type.folder_group]: async (artifacts, options) => {
        return AdapterResult.create([await fileSystemAdapter.folderGroup(artifacts, options)]);
      },
      [Step.Type.filter]: async (artifacts, options) => {
        return AdapterResult.create(await filterAdapter.filter(artifacts, options));
      },
      [Step.Type.custom_script]: async (artifacts, options) => {
        return AdapterResult.create(await scriptAdapter.execute(artifacts, options));
      },
      [Step.Type.s3_upload]: async (artifacts, options, trail) => {
        await s3Adapter.upload(artifacts, options, trail);
        return AdapterResult.create();
      },
      [Step.Type.s3_download]: async (_, options) => {
        return AdapterResult.create(await s3Adapter.download(options));
      },
      [Step.Type.postgres_backup]: async (_, options) => {
        return AdapterResult.create(await postgresAdapter.backup(options));
      },
      [Step.Type.postgres_restore]: async (artifacts, options) => {
        await postgresAdapter.restore(artifacts, options);
        return AdapterResult.create();
      },
    };
  }

  public async submit<S extends Step>(artifacts: Artifact[], step: S, trail: StepWithRuntime[]): Promise<AdapterResult> {
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
