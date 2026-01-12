import { S3Client as BunS3Client } from "bun";
import { S3Client as AWSS3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export class BrespiS3Client extends BunS3Client {
  private readonly awsClient: AWSS3Client;

  public constructor(private readonly options: Bun.S3Options) {
    super(options);
    this.awsClient = new AWSS3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId!,
        secretAccessKey: options.secretAccessKey!,
      },
      forcePathStyle: true,
    });
  }

  public async listAllKeys({ prefix } = {} as { prefix?: string }) {
    const keys: string[] = [];
    let startAfter: string | undefined;
    while (true) {
      const response = await this.list({
        prefix,
        maxKeys: 1000,
        ...(startAfter ? { startAfter } : {}),
      });
      const newKeys = (response.contents || []).map(({ key }) => key);
      keys.push(...newKeys);
      if (response.isTruncated) {
        const lastKey = newKeys.at(-1);
        if (lastKey) {
          startAfter = lastKey;
          continue;
        }
      }
      break;
    }
    return keys;
  }

  public async deleteAll({ keys }: { keys: string[] }) {
    const batchSize = 100;
    for (let batchIndex = 0; true; batchIndex++) {
      const batch = keys.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      if (batch.length === 0) {
        break;
      }
      await this.awsClient.send(
        new DeleteObjectsCommand({
          Bucket: this.options.bucket,
          Delete: {
            Objects: batch.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
    }
  }
}
