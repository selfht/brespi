import { expect, Page } from "@playwright/test";

export namespace ExecutionFlow {
  type ExecutePipelineOptions = {
    expectedOutcome: "success" | "error";
  };
  export async function executeCurrentPipeline(page: Page, { expectedOutcome = "success" } = {} as ExecutePipelineOptions) {
    await page.getByRole("button", { name: "Execute" }).click();
    if (expectedOutcome === "success") {
      await expect(page.getByText("This execution has succeeded")).toBeVisible();
    }
    if (expectedOutcome === "error") {
      await expect(page.getByText("This execution has failed")).toBeVisible();
    }
  }
}
