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

  public async listAllKeys({ prefix }: { prefix?: string } = {}) {
    const batchSize = 1000;
    const keys: string[] = [];
    let startAfter: string | undefined;
    while (true) {
      const response = await this.list({
        prefix,
        maxKeys: batchSize,
        ...(startAfter ? { startAfter } : {}),
      });
      const newKeys = (response.contents || []).map(({ key }) => key);
      keys.push(...newKeys);
      if (response.isTruncated) {
        const lastKey = newKeys.at(-1);
        if (lastKey) {
          startAfter = lastKey;
          continue;
        } else {
          throw new Error(`Invalid state; S3 list was truncated, but returned no keys`);
        }
      }
      break;
    }
    return keys;
  }

  public async deleteAll({ keys }: { keys: string[] }) {
    const batchSize = 100;
    const errors: Array<{ key: string; code: string }> = [];
    // Delete in batches
    for (let batchIndex = 0; true; batchIndex++) {
      const batch = keys.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      if (batch.length === 0) {
        break;
      }
      // Using the AWS client here, because Bun's client doesn't support multi-delete (yet)
      const result = await this.awsClient.send(
        new DeleteObjectsCommand({
          Bucket: this.options.bucket,
          Delete: {
            Objects: batch.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
      if (result.Errors?.length) {
        for (const err of result.Errors) {
          errors.push({
            key: err.Key!,
            code: err.Code!,
          });
        }
      }
    }
    // Check for errors
    if (errors.length > 0) {
      const details = {
        errorsTruncated: errors.length > 10,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
      };
      throw new Error(`S3 batch deletion (partially) failed; ${JSON.stringify(details, null, 2)}`);
    }
  }
}
