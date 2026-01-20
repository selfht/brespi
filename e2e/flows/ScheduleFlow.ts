import { expect, Page } from "@playwright/test";

export namespace ScheduleFlow {
  type CreateScheduleOptions = {
    pipelineName: string;
    cron: string;
    active: boolean;
  };
  export async function createSchedule(page: Page, { active, pipelineName, cron }: CreateScheduleOptions) {
    await page.goto("schedules");
    const newScheduleButtonLocator = page.getByRole("button", { name: "New Schedule ...", exact: true });

    await newScheduleButtonLocator.click();
    await page.getByLabel("Active").selectOption(active ? "true" : "false");
    await page.getByLabel("Pipeline").selectOption(pipelineName);
    await page.getByLabel("Cron").fill(cron);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(newScheduleButtonLocator).toBeVisible();
  }
}
