import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

export namespace S3Boundary {
  export const BUCKET = "bucko";
  export const ENDPOINT = "http://s3:4566";

  const client = new S3Client({
    endpoint: "http://localhost:4566",
    region: "eu-central-1",
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
