import { Mutex } from "@/helpers/Mutex";
import { NamingHelper } from "@/helpers/NamingHelper";
import { Artifact } from "@/models/Artifact";
import { PipelineStep } from "@/models/PipelineStep";
import { S3Client } from "bun";
import { basename, join } from "path";
import { S3Manifest } from "./S3Manifest";
import { S3Meta } from "./S3Meta";
import { stat } from "fs/promises";

export class S3Adapter {
  private static readonly MANIFEST_MUTEX = new Mutex();

  public constructor() {}
  public async upload(artifacts: Artifact[], options: PipelineStep.S3Upload, trail: PipelineStep[]): Promise<void> {
    const client = new S3Client({
      accessKeyId: "kim",
      secretAccessKey: "possible",
      bucket: "my-backups",
      endpoint: "http://minio:9000",
    });

    const manifest = await this.handleManifestExclusively(client, options.folder, async (s3Manifest, s3Save) => {
      s3Manifest.uploads.unshift(
        ...artifacts.map((artifact) => ({
          name: artifact.name,
          path: basename(NamingHelper.generatePath(artifact)),
          timestamp: artifact.timestamp,
        })),
      );
      return s3Save(s3Manifest);
    });

    for (const artifact of artifacts) {
      const { path: s3Path } = manifest.uploads.find((a) => a.name === artifact.name)!;
      const meta: S3Meta = {
        version: 1,
        object: "meta",
        name: artifact.name,
        timestamp: artifact.timestamp,
        trail,
      };
      await client.write(join(options.folder, `${s3Path}.brespi.json`), JSON.stringify(meta));
      await client.write(join(options.folder, s3Path), Bun.file(artifact.path));
    }
  }

  public async download(options: PipelineStep.S3Download): Promise<Artifact> {
    const client = new S3Client({
      accessKeyId: "kim",
      secretAccessKey: "possible",
      bucket: "my-backups",
      endpoint: "http://minio:9000",
    });

    const manifest: S3Manifest = await this.handleManifestExclusively(client, options.folder, (manifest) => manifest);
    const target =
      options.selection === "latest"
        ? manifest.uploads.find((u) => u.name === options.name)
        : manifest.uploads.find((u) => u.name === options.name && u.path === options.version);
    if (!target) {
      throw new Error(`Upload entry not found for options: ${JSON.stringify(options)}`);
    }
    const s3FileMeta = client.file(join(options.folder, `${target.path}.brespi.json`));
    if (!(await s3FileMeta.exists())) {
      throw new Error(`Upload file meta not found for options: ${JSON.stringify(options)}`);
    }
    const s3File = client.file(join(options.folder, target.path));
    if (!(await s3File.exists())) {
      throw new Error(`Upload file not found for options: ${JSON.stringify(options)}`);
    }

    const meta = S3Meta.parse(await s3FileMeta.json());
    const path = NamingHelper.generatePath({ name: meta.name, timestamp: meta.timestamp });
    await Bun.write(path, s3File);

    const stats = await stat(path);
    return {
      path: path,
      size: stats.size,
      type: "file",
      name: meta.name,
      timestamp: meta.timestamp,
    };
  }

  private async handleManifestExclusively<T>(
    client: S3Client,
    folder: string,
    fn: (mani: S3Manifest, save: (mani: S3Manifest) => Promise<S3Manifest>) => T | Promise<T>,
  ): Promise<Awaited<T>> {
    const release = await S3Adapter.MANIFEST_MUTEX.acquire();
    try {
      const s3Path = join(folder, "__brespi__.json");
      const s3File = client.file(s3Path);
      const s3Manifest: S3Manifest = (await s3File.exists()) ? S3Manifest.parse(await s3File.json()) : S3Manifest.empty();
      const s3Save = (mani: S3Manifest) => client.write(s3Path, JSON.stringify(s3Manifest)).then(() => mani);
      return await fn(s3Manifest, s3Save);
    } finally {
      release();
    }
  }
}
