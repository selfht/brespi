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
    await submitSave(page);
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
    await submitSave(page);
  }

  type RemoveOptions = {
    index: number;
  };
  export async function remove(page: Page, { index }: RemoveOptions) {
    await page.getByRole("link", { name: "Notifications", exact: true }).click();
    await page.getByTestId("policy-row").nth(index).getByRole("button", { name: "Edit" }).click();
    await submitDelete(page);
  }

  async function submitSave(page: Page) {
    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await saveButton.click();
    await expect(saveButton).not.toBeVisible();
  }

  async function submitDelete(page: Page) {
    const deleteButton = page.getByRole("button", { name: "Delete", exact: true });
    await deleteButton.click();
    await page.getByRole("button", { name: "Yes, delete", exact: true }).click(); // Pop-up
    await expect(deleteButton).not.toBeVisible();
  }
}
