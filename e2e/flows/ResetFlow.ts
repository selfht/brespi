import { APIRequestContext } from "@playwright/test";
import { rm } from "fs/promises";
import { join } from "path";

export namespace ResetFlow {
  type Args = {
    request: APIRequestContext;
  };
  export async function reset({ request }: Args) {
    await deleteAllPipelines({ request });
    await emptyS3Bucket({ request });
    await deleteFileSystemWrites();
  }
  export async function deleteAllPipelines({ request }: Args) {
    await request.post("/api/restricted/delete-all-pipelines", {
      failOnStatusCode: true,
    });
  }
  export async function emptyS3Bucket({ request }: Args) {
    await request.post("/api/restricted/empty-bucket", {
      data: {
        bucket: "bucko",
        endpoint: "http://s3:4566",
        region: null,
        accessKey: "test",
        secretKey: "test",
      },
      failOnStatusCode: true,
    });
  }
  export async function deleteFileSystemWrites() {
    await rm(join("opt", "files"), { recursive: true, force: true });
  }
}
