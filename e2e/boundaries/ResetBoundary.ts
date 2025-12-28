import { APIRequestContext } from "@playwright/test";
import { FileSystemBoundary } from "e2e/boundaries/FileSystemBoundary";
import { S3Boundary } from "e2e/boundaries/S3Boundary";

export namespace ResetBoundary {
  type Args = {
    request: APIRequestContext;
  };
  export async function reset({ request }: Args) {
    await request.post("/api/restricted/delete-all-pipelines", { failOnStatusCode: true });
    await S3Boundary.emptyBucket();
    await FileSystemBoundary.deleteScratchPad();
  }
}
