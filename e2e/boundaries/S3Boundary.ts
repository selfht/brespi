import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export namespace S3Boundary {
  export const connectionDefaults = {
    bucket: "bucko",
    region: "eu-central-1",
    endpoint: "http://s3:4566",
    accessKey: "${MY_S3_ACCESS_KEY}",
    secretKey: "${MY_S3_SECRET_KEY}",
  };

  const client = new S3Client({
    endpoint: "http://localhost:4566",
    region: connectionDefaults.region,
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
    },
    forcePathStyle: true,
  });

  export async function listBucket(baseFolder = ""): Promise<string[]> {
    const keys: string[] = [];
    const listCommand = new ListObjectsV2Command({ Bucket: connectionDefaults.bucket });
    const { Contents = [] } = await client.send(listCommand);
    if (Contents.length > 0) {
      for (const object of Contents) {
        if (object.Key && object.Key.startsWith(baseFolder)) {
          keys.push(object.Key);
        }
      }
    }
    return keys;
  }

  export async function writeBucket(path: string, content: string): Promise<void> {
    await client.send(
      new PutObjectCommand({
        Bucket: connectionDefaults.bucket,
        Key: path,
        Body: content,
      }),
    );
  }

  export async function emptyBucket() {
    for (const key of await listBucket()) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: connectionDefaults.bucket,
          Key: key,
        }),
      );
    }
  }
}
