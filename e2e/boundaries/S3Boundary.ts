import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

export namespace S3Boundary {
  export const Config = {
    BUCKET: "bucko",
    BASE_FOLDER: "/backups",
    ENDPOINT_PLAYWRIGHT: "http://localhost:4566",
    ENDPOINT_APP: "http://s3:4566",
    ACCESS_KEY: "test",
    SECRET_KEY: "test",
  };

  const client = new S3Client({
    endpoint: Config.ENDPOINT_PLAYWRIGHT,
    region: "eu-central-1",
    credentials: {
      accessKeyId: Config.ACCESS_KEY,
      secretAccessKey: Config.SECRET_KEY,
    },
    forcePathStyle: true,
  });

  export async function listBucket(): Promise<string[]> {
    const keys: string[] = [];
    const listCommand = new ListObjectsV2Command({ Bucket: Config.BUCKET });
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
          Bucket: Config.BUCKET,
          Key: key,
        }),
      );
    }
  }
}
