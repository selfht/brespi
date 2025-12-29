import { APIRequestContext } from "@playwright/test";
import { FilesystemBoundary } from "./FilesystemBoundary";
import { S3Boundary } from "e2e/boundaries/S3Boundary";

export namespace ResetBoundary {
  type ResetOptions = {
    request: APIRequestContext;
  };
  export async function reset({ request }: ResetOptions) {
    await request.post("/api/restricted/delete-all-pipelines", { failOnStatusCode: true });
    await S3Boundary.emptyBucket();
    await FilesystemBoundary.ensureEmptyScratchPad();
  }
}
