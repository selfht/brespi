import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

export namespace S3Boundary {
  export const ENDPOINT = "http://s3:4566";
  export const REGION = "eu-central-1";
  export const BUCKET = "bucko";

  const client = new S3Client({
    endpoint: "http://localhost:4566",
    region: REGION,
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
    },
    forcePathStyle: true,
  });

  export async function listBucket(): Promise<string[]> {
    const keys: string[] = [];
    const listCommand = new ListObjectsV2Command({ Bucket: BUCKET });
    const { Contents = [] } = await client.send(listCommand);
    if (Contents.length > 0) {
      for (const object of Contents) {
        if (object.Key) {
          keys.push(object.Key);
        }
      }
    }
    return keys;
  }

  export async function emptyBucket() {
    for (const key of await listBucket()) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: key,
        }),
      );
    }
  }
}
