import { expect, Page } from "@playwright/test";
import { Common } from "e2e/common/Common";

export namespace ExecutionFlow {
  type ExecutePipelineOptions = {
    id?: string;
    expectedOutcome?: "success" | "error";
  };
  export async function executePipeline(page: Page, { id, expectedOutcome = "success" } = {} as ExecutePipelineOptions) {
    if (id) {
      await page.goto(`pipelines/${id}`);
    } else {
      const pipelineIdFromUrl = Common.extractCurrentPipelineIdFromUrl(page);
      if (!pipelineIdFromUrl) {
        throw new Error("Cannot execute pipeline; no active pipeline view is open, and no id was supplied");
      }
    }

    const nameLocator = page.getByRole("heading", { level: 1 });
    await expect(nameLocator).toHaveText(/.+/);
    const name = await nameLocator.textContent();
    await expect(page).toHaveTitle(`${name} | Pipelines | Brespi`);

    await page.getByRole("button", { name: "Execute", exact: true }).click();
    if (expectedOutcome === "success") {
      await expect(page.getByText("This execution has succeeded")).toBeVisible();
    }
    if (expectedOutcome === "error") {
      await expect(page.getByText("This execution has failed")).toBeVisible();
    }
  }
}
