import { expect, Page } from "@playwright/test";

export namespace ScheduleFlow {
  type CreateOptions = {
    pipelineName: string;
    cron: string;
    active: boolean;
  };
  export async function createSchedule(page: Page, { active, pipelineName, cron }: CreateOptions) {
    await page.goto("schedules");
    page.getByRole("button", { name: "New Schedule ...", exact: true }).click();
    await page.getByLabel("Active").setChecked(active, { force: true }); // Force, because it's hidden (opaque)
    await page.getByLabel("Pipeline").selectOption(pipelineName);
    await page.getByLabel("Cron").fill(cron);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // wait until "New Schedule" is visible again
    await expect(page.getByRole("button", { name: "New Schedule ...", exact: true })).toBeVisible();
  }

  type UpdateOptions = {
    pipelineName: string;
    cron?: string;
    active?: boolean;
  };
  export async function updateSchedule(page: Page, { active, pipelineName, cron }: UpdateOptions) {
    await page.goto("schedules");
    const scheduleRow = page.getByTestId("schedule-row").filter({ hasText: pipelineName });
    await scheduleRow.getByRole("button", { name: "Edit" }).click();
    if (active !== undefined) await page.getByLabel("Active").setChecked(active, { force: true }); // Force, because it's hidden (opaque)
    if (cron !== undefined) await page.getByLabel("Cron").fill(cron);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // wait until we can no longer see the "Save button"
    await expect(page.getByRole("button", { name: "Save", exact: true })).not.toBeVisible();
  }
}
