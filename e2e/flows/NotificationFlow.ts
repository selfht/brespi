import { expect, Page } from "@playwright/test";

export namespace NotificationFlow {
  type CreatePolicyOptions = {
    active: boolean;
    channel: "Custom script";
    customScriptPath: string;
    events: {
      execution_started: boolean;
      execution_completed: boolean;
    };
  };
  export async function createPolicy(page: Page, { active, channel, customScriptPath, events }: CreatePolicyOptions) {
    await page.getByRole("link", { name: "Notifications", exact: true }).click();
    page.getByRole("button", { name: "New Policy ...", exact: true }).click();
    await page.getByLabel("Active").setChecked(active, { force: true }); // Force, because it's hidden (opaque)
    await page.getByLabel("Channel").selectOption(channel);
    if (channel === "Custom script") {
      await page.getByLabel("path for the custom script").fill(customScriptPath);
    }
    for (const [key, enabled] of Object.entries(events)) {
      await page.getByLabel(key).setChecked(enabled);
    }
    await save(page);
  }

  type UpdateOptions = {
    index: number;
    active?: boolean;
    channel?: "Custom script";
    customScriptPath?: string;
    events?: {
      execution_started?: boolean;
      execution_completed?: boolean;
    };
  };
  export async function updateSchedule(page: Page, { index, active, channel, customScriptPath, events }: UpdateOptions) {
    await page.getByRole("link", { name: "Notifications", exact: true }).click();
    await page.getByTestId("policy-row").nth(index).getByRole("button", { name: "Edit" }).click();
    if (active !== undefined) await page.getByLabel("Active").setChecked(active, { force: true }); // Force, because it's hidden (opaque)
    if (channel !== undefined) await page.getByLabel("Channel").selectOption(channel);
    if (channel === "Custom script") {
      if (customScriptPath !== undefined) await page.getByLabel("path for the custom script").fill(customScriptPath);
    }
    if (events !== undefined) {
      for (const [key, enabled] of Object.entries(events)) {
        await page.getByLabel(key).setChecked(enabled);
      }
    }
    await save(page);
  }

  async function save(page: Page) {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save", exact: true })).not.toBeVisible();
  }
}
