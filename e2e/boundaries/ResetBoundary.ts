import { APIRequestContext } from "@playwright/test";
import { S3Boundary } from "e2e/boundaries/S3Boundary";
import { FilesystemBoundary } from "./FilesystemBoundary";

export namespace ResetBoundary {
  type ResetOptions = {
    request: APIRequestContext;
  };
  export async function reset({ request }: ResetOptions) {
    await request.post("/api/restricted/purge", { failOnStatusCode: true });
    await S3Boundary.emptyBucket();
    await FilesystemBoundary.ensureEmptyScratchPad();
  }
}
