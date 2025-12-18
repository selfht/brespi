import { Mutex } from "@/helpers/Mutex";
import { Artifact } from "@/models/Artifact";
import { S3Manifest } from "@/models/s3/S3Manifest";
import { S3Meta } from "@/models/s3/S3Meta";
import { Step } from "@/models/Step";
import { Temporal } from "@js-temporal/polyfill";
import { S3Client } from "bun";
import { stat } from "fs/promises";
import { join } from "path";
import { AdapterHelper } from "../AdapterHelper";

export class S3Adapter {
  private static readonly MANIFEST_MUTEX = new Mutex();

  private static readonly MANIFEST_FILE_NAME = "__brespi_manifest__.json";
  private static readonly META_FILE_NAME = "__brespi_meta__.json";

  public constructor() {}

  public async upload(artifacts: Artifact[], options: Step.S3Upload, stepTrail: Step[]): Promise<void> {
    // TODO
    const client = new S3Client({
      accessKeyId: "kim",
      secretAccessKey: "possible",
      bucket: "my-backups",
      endpoint: "http://minio:9000",
    });

    // 1. Update the global manifest for this base folder
    const timestamp = Temporal.Now.plainDateTimeISO();
    const relativeUploadPath = `${timestamp}-${this.generateShortRandomString()}`;
    const manifest = await this.handleManifestExclusively(client, options.baseFolder, async (s3Manifest, s3Save) => {
      s3Manifest.uploads.push({
        isoTimestamp: timestamp.toString(),
        path: relativeUploadPath,
      });
      return await s3Save(s3Manifest);
    });

    // 2. Write the meta for the current upload
    const absoluteUploadPath = join(options.baseFolder, relativeUploadPath);
    await client.write(
      join(absoluteUploadPath, S3Adapter.META_FILE_NAME),
      JSON.stringify({
        version: 1,
        object: "meta",
        artifacts: artifacts.map((artifact) => ({
          path: artifact.name, // (sic) `artifact.name` is unique in each batch (and artifact.path` refers to the current path on the filesystem)
          stepTrail,
        })),
      } satisfies S3Meta),
    );

    // 3. Write the artifacts themselves
    for (const artifact of artifacts) {
      await client.write(join(absoluteUploadPath, artifact.name), Bun.file(artifact.path));
    }
  }

  public async download(options: Step.S3Download): Promise<Artifact[]> {
    const client = new S3Client({
      accessKeyId: "kim",
      secretAccessKey: "possible",
      bucket: "my-backups",
      endpoint: "http://minio:9000",
    });

    const previousUpload = await this.handleManifestExclusively(client, options.baseFolder, (manifest) => {
      return this.findMatchingUpload(manifest, options.selection);
    });

    const previousUploadFolder = join(options.baseFolder, previousUpload.path);

    const artifacts: Artifact[] = [];
    const listResponse = await client.list({ prefix: previousUploadFolder });

    for (const item of listResponse.contents ?? []) {
      const fileName = item.key.split("/").pop() || "";
      if (fileName === S3Adapter.META_FILE_NAME) {
        continue;
      }
      const { outputId, outputPath } = AdapterHelper.generateArtifactPath();
      await Bun.write(outputPath, client.file(item.key));
      const { size } = await stat(outputPath);
      artifacts.push({
        id: outputId,
        type: "file",
        name: fileName,
        path: outputPath,
        size,
      });
    }
    return artifacts;
  }

  private async handleManifestExclusively<T>(
    client: S3Client,
    folder: string,
    fn: (mf: S3Manifest, save: (mani: S3Manifest) => Promise<S3Manifest>) => T | Promise<T>,
  ): Promise<Awaited<T>> {
    const release = await S3Adapter.MANIFEST_MUTEX.acquire();
    try {
      const s3Path = join(folder, S3Adapter.MANIFEST_FILE_NAME);
      const s3File = client.file(s3Path);
      const s3Manifest: S3Manifest = (await s3File.exists()) ? S3Manifest.parse(await s3File.json()) : S3Manifest.empty();
      const s3Save = (mf: S3Manifest) => client.write(s3Path, JSON.stringify(s3Manifest)).then(() => mf);
      return await fn(s3Manifest, s3Save);
    } finally {
      release();
    }
  }

  private generateShortRandomString(): string {
    const length = 6;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < length; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  private findMatchingUpload(manifest: S3Manifest, selection: Step.S3Download["selection"]): S3Manifest.Upload {
    switch (selection.target) {
      case "latest": {
        const sortedUploads = manifest.uploads.toSorted(({ isoTimestamp: t1 }, { isoTimestamp: t2 }) => {
          return Temporal.PlainDateTime.compare(Temporal.PlainDateTime.from(t1), Temporal.PlainDateTime.from(t2));
        });
        if (sortedUploads.length === 0) {
          throw new Error("Latest upload could not be found");
        }
        return sortedUploads[0];
      }
      case "specific": {
        const version = selection.version;
        const matchingUploads = manifest.uploads.filter((u) => u.isoTimestamp === version || u.path === version);
        if (matchingUploads.length === 0) {
          throw new Error("Specific upload could not be found");
        }
        if (matchingUploads.length > 1) {
          throw new Error(`Specific upload could not be identified uniquely; matches=${matchingUploads.length}`);
        }
        return matchingUploads[0];
      }
    }
  }
}
