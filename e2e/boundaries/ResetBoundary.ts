import { APIRequestContext } from "@playwright/test";
import { S3Boundary } from "e2e/boundaries/S3Boundary";
import { FSBoundary } from "./FSBoundary";

export namespace ResetBoundary {
  export async function reset(request: APIRequestContext) {
    await request.post("/api/restricted/purge", { failOnStatusCode: true });
    await S3Boundary.emptyBucket();
    await FSBoundary.ensureEmptyScratchPad();
  }
}
