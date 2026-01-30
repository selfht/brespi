import { expect, Page } from "@playwright/test";

export namespace ScheduleFlow {
  type CreateOptions = {
    pipelineName: string;
    cron: string;
    active: boolean;
  };
  export async function create(page: Page, { active, pipelineName, cron }: CreateOptions) {
    await page.getByRole("link", { name: "Schedules", exact: true }).click();
    page.getByRole("button", { name: "New Schedule ...", exact: true }).click();
    await page.getByLabel("Active").setChecked(active, { force: true }); // Force, because it's hidden (opaque)
    await page.getByLabel("Pipeline").selectOption(pipelineName);
    await page.getByLabel("Cron").fill(cron);
    await save(page);
  }

  type UpdateOptions = {
    index: number;
    active?: boolean;
    pipelineName?: string;
    cron?: string;
  };
  export async function update(page: Page, { index, active, pipelineName, cron }: UpdateOptions) {
    await page.getByRole("link", { name: "Schedules", exact: true }).click();
    await page.getByTestId("schedule-row").nth(index).getByRole("button", { name: "Edit" }).click();
    if (active !== undefined) await page.getByLabel("Active").setChecked(active, { force: true }); // Force, because it's hidden (opaque)
    if (pipelineName !== undefined) await page.getByLabel("Pipeline").selectOption(pipelineName);
    if (cron !== undefined) await page.getByLabel("Cron").fill(cron);
    await save(page);
  }

  async function save(page: Page) {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save", exact: true })).not.toBeVisible();
  }
}
